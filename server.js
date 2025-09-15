const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const url = require('url');

// Create Express app for serving static files and health checks
const app = express();
const PORT = process.env.PORT || 3000;

// ===========================================
// CONFIGURATION (Environment Variables)
// ===========================================
const CONFIG = {
  // Authentication
  AUTH_TOKEN: process.env.AUTH_TOKEN || 'test123',
  
  // Connection Limits
  MAX_CONNECTIONS: parseInt(process.env.MAX_CONNECTIONS) || 10,
  CONNECTION_TIMEOUT_MINUTES: parseInt(process.env.CONNECTION_TIMEOUT_MINUTES) || 5,
  
  // Rate Limiting
  RATE_LIMIT_MESSAGES: parseInt(process.env.RATE_LIMIT_MESSAGES) || 10, // messages per minute
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  
  // Auto-shutdown
  AUTO_SHUTDOWN_HOURS: parseInt(process.env.AUTO_SHUTDOWN_HOURS) || 2,
  ENABLE_AUTO_SHUTDOWN: process.env.ENABLE_AUTO_SHUTDOWN !== 'false',
  
  // IP Whitelist (comma-separated)
  IP_WHITELIST: process.env.IP_WHITELIST ? process.env.IP_WHITELIST.split(',').map(ip => ip.trim()) : [],
  ENABLE_IP_WHITELIST: process.env.ENABLE_IP_WHITELIST === 'true'
};

// ===========================================
// SECURITY STATE TRACKING
// ===========================================
const securityState = {
  connections: new Map(), // clientId -> connection info
  rateLimits: new Map(),  // IP -> message count and window
  connectionCount: 0,
  startTime: Date.now(),
  totalConnectionAttempts: 0,
  rejectedConnections: 0
};

// ===========================================
// MIDDLEWARE & ROUTES
// ===========================================
app.use(express.static('public'));
app.use(express.json());

// Health check endpoint with security stats
app.get('/health', (req, res) => {
  const uptime = Date.now() - securityState.startTime;
  const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2);
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: {
      ms: uptime,
      hours: uptimeHours,
      autoShutdownIn: CONFIG.ENABLE_AUTO_SHUTDOWN ? 
        Math.max(0, (CONFIG.AUTO_SHUTDOWN_HOURS * 60 * 60 * 1000) - uptime) : null
    },
    connections: {
      active: securityState.connectionCount,
      max: CONFIG.MAX_CONNECTIONS,
      total_attempts: securityState.totalConnectionAttempts,
      rejected: securityState.rejectedConnections
    },
    limits: {
      maxConnections: CONFIG.MAX_CONNECTIONS,
      connectionTimeoutMinutes: CONFIG.CONNECTION_TIMEOUT_MINUTES,
      rateLimit: `${CONFIG.RATE_LIMIT_MESSAGES} messages per minute`,
      ipWhitelistEnabled: CONFIG.ENABLE_IP_WHITELIST,
      autoShutdownHours: CONFIG.AUTO_SHUTDOWN_HOURS
    }
  });
});

// Admin endpoints (require token)
app.get('/admin/shutdown', (req, res) => {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  if (token !== CONFIG.AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.json({ message: 'Shutting down server in 5 seconds...' });
  setTimeout(() => {
    console.log('[ADMIN] Manual shutdown requested');
    process.exit(0);
  }, 5000);
});

app.get('/admin/stats', (req, res) => {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  if (token !== CONFIG.AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.json({
    securityState,
    config: CONFIG,
    uptime: Date.now() - securityState.startTime
  });
});

// Serve test client at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===========================================
// SECURITY FUNCTIONS
// ===========================================

function validateToken(req) {
  const query = url.parse(req.url, true).query;
  const token = query.token;
  return token === CONFIG.AUTH_TOKEN;
}

function isIPWhitelisted(ip) {
  if (!CONFIG.ENABLE_IP_WHITELIST) return true;
  return CONFIG.IP_WHITELIST.includes(ip);
}

function checkRateLimit(ip) {
  const now = Date.now();
  const clientLimits = securityState.rateLimits.get(ip) || { count: 0, windowStart: now };
  
  // Reset window if expired
  if (now - clientLimits.windowStart > CONFIG.RATE_LIMIT_WINDOW_MS) {
    clientLimits.count = 0;
    clientLimits.windowStart = now;
  }
  
  clientLimits.count++;
  securityState.rateLimits.set(ip, clientLimits);
  
  return clientLimits.count <= CONFIG.RATE_LIMIT_MESSAGES;
}

function cleanupConnection(clientId) {
  if (securityState.connections.has(clientId)) {
    const connInfo = securityState.connections.get(clientId);
    if (connInfo.timeoutId) {
      clearTimeout(connInfo.timeoutId);
    }
    securityState.connections.delete(clientId);
    securityState.connectionCount--;
  }
}

// ===========================================
// AUTO-SHUTDOWN TIMER
// ===========================================
if (CONFIG.ENABLE_AUTO_SHUTDOWN) {
  const shutdownTimer = setTimeout(() => {
    console.log(`[AUTO-SHUTDOWN] Server running for ${CONFIG.AUTO_SHUTDOWN_HOURS} hours, shutting down to prevent excessive costs`);
    process.exit(0);
  }, CONFIG.AUTO_SHUTDOWN_HOURS * 60 * 60 * 1000);
  
  console.log(`[SECURITY] Auto-shutdown enabled: ${CONFIG.AUTO_SHUTDOWN_HOURS} hours`);
}

// ===========================================
// HTTP SERVER & WEBSOCKET SERVER
// ===========================================
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ 
  server,
  verifyClient: (info) => {
    securityState.totalConnectionAttempts++;
    
    const clientIP = info.req.socket.remoteAddress;
    
    // Check connection limit
    if (securityState.connectionCount >= CONFIG.MAX_CONNECTIONS) {
      console.log(`[SECURITY] Connection rejected: Max connections (${CONFIG.MAX_CONNECTIONS}) reached. IP: ${clientIP}`);
      securityState.rejectedConnections++;
      return false;
    }
    
    // Check IP whitelist
    if (!isIPWhitelisted(clientIP)) {
      console.log(`[SECURITY] Connection rejected: IP not whitelisted. IP: ${clientIP}`);
      securityState.rejectedConnections++;
      return false;
    }
    
    // Check authentication token
    if (!validateToken(info.req)) {
      console.log(`[SECURITY] Connection rejected: Invalid token. IP: ${clientIP}`);
      securityState.rejectedConnections++;
      return false;
    }
    
    return true;
  }
});

// Connection counter for client IDs
let connectionIdCounter = 0;

wss.on('connection', (ws, req) => {
  connectionIdCounter++;
  securityState.connectionCount++;
  
  const clientId = connectionIdCounter;
  const clientIP = req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  console.log(`[${new Date().toISOString()}] ✅ Client ${clientId} connected from ${clientIP}`);
  console.log(`[STATS] Active connections: ${securityState.connectionCount}/${CONFIG.MAX_CONNECTIONS}`);

  // Set up connection timeout
  const timeoutId = setTimeout(() => {
    console.log(`[TIMEOUT] Client ${clientId} connection timeout after ${CONFIG.CONNECTION_TIMEOUT_MINUTES} minutes`);
    ws.close(1000, 'Connection timeout');
  }, CONFIG.CONNECTION_TIMEOUT_MINUTES * 60 * 1000);

  // Store connection info
  securityState.connections.set(clientId, {
    ip: clientIP,
    userAgent,
    connectedAt: new Date().toISOString(),
    timeoutId,
    messageCount: 0
  });

  // Send welcome message with server limits
  const welcomeMessage = {
    type: 'welcome',
    clientId: clientId,
    message: '🔐 Connected to Secured Railway WebSocket Server',
    timestamp: new Date().toISOString(),
    serverLimits: {
      maxConnections: CONFIG.MAX_CONNECTIONS,
      connectionTimeoutMinutes: CONFIG.CONNECTION_TIMEOUT_MINUTES,
      rateLimit: {
        maxMessages: CONFIG.RATE_LIMIT_MESSAGES,
        perMinutes: CONFIG.RATE_LIMIT_WINDOW_MS / 60000
      },
      autoShutdownHours: CONFIG.ENABLE_AUTO_SHUTDOWN ? CONFIG.AUTO_SHUTDOWN_HOURS : null
    },
    currentStats: {
      activeConnections: securityState.connectionCount,
      yourIP: clientIP
    }
  };
  
  ws.send(JSON.stringify(welcomeMessage));

  // Handle incoming messages
  ws.on('message', (data) => {
    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      console.log(`[RATE_LIMIT] Client ${clientId} (${clientIP}) exceeded rate limit`);
      ws.send(JSON.stringify({
        type: 'error',
        message: `Rate limit exceeded: ${CONFIG.RATE_LIMIT_MESSAGES} messages per minute`,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    try {
      const message = JSON.parse(data);
      
      // Update message count for this connection
      const connInfo = securityState.connections.get(clientId);
      if (connInfo) {
        connInfo.messageCount++;
      }
      
      console.log(`[${new Date().toISOString()}] 📨 Client ${clientId} sent:`, message);

      // Echo the message back with additional info
      const response = {
        type: 'echo',
        clientId: clientId,
        originalMessage: message,
        serverTimestamp: new Date().toISOString(),
        activeConnections: securityState.connectionCount,
        yourMessageCount: connInfo ? connInfo.messageCount : 0
      };

      ws.send(JSON.stringify(response));
    } catch (error) {
      // Handle non-JSON messages
      console.log(`[${new Date().toISOString()}] 📝 Client ${clientId} sent raw:`, data.toString());
      
      const response = {
        type: 'echo',
        clientId: clientId,
        originalMessage: data.toString(),
        serverTimestamp: new Date().toISOString(),
        activeConnections: securityState.connectionCount
      };

      ws.send(JSON.stringify(response));
    }
  });

  // Handle connection close
  ws.on('close', (code, reason) => {
    console.log(`[${new Date().toISOString()}] ❌ Client ${clientId} disconnected. Code: ${code}, Reason: ${reason}`);
    console.log(`[STATS] Active connections: ${securityState.connectionCount - 1}/${CONFIG.MAX_CONNECTIONS}`);
    cleanupConnection(clientId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] 💥 Client ${clientId} error:`, error);
    cleanupConnection(clientId);
  });
});

// ===========================================
// HEARTBEAT & CLEANUP
// ===========================================
const heartbeatInterval = setInterval(() => {
  const heartbeatMessage = {
    type: 'heartbeat',
    timestamp: new Date().toISOString(),
    activeConnections: securityState.connectionCount,
    uptime: Math.floor((Date.now() - securityState.startTime) / 1000)
  };

  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(heartbeatMessage));
    }
  });
}, 30000); // Every 30 seconds

// Cleanup rate limit data periodically
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, limits] of securityState.rateLimits.entries()) {
    if (now - limits.windowStart > CONFIG.RATE_LIMIT_WINDOW_MS * 2) {
      securityState.rateLimits.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes

// ===========================================
// GRACEFUL SHUTDOWN
// ===========================================
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM received, shutting down gracefully');
  clearInterval(heartbeatInterval);
  clearInterval(cleanupInterval);
  
  // Close all WebSocket connections
  wss.clients.forEach((ws) => {
    ws.close(1001, 'Server shutting down');
  });
  
  server.close(() => {
    console.log('[SHUTDOWN] Process terminated');
  });
});

// ===========================================
// START SERVER
// ===========================================
server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 SECURE WEBSOCKET SERVER STARTED');
  console.log('='.repeat(50));
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 WebSocket endpoint: ws://localhost:${PORT}?token=${CONFIG.AUTH_TOKEN}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test client: http://localhost:${PORT}`);
  console.log('');
  console.log('🔒 SECURITY CONFIGURATION:');
  console.log(`   • Auth Token: ${CONFIG.AUTH_TOKEN}`);
  console.log(`   • Max Connections: ${CONFIG.MAX_CONNECTIONS}`);
  console.log(`   • Connection Timeout: ${CONFIG.CONNECTION_TIMEOUT_MINUTES} minutes`);
  console.log(`   • Rate Limit: ${CONFIG.RATE_LIMIT_MESSAGES} messages/minute`);
  console.log(`   • IP Whitelist: ${CONFIG.ENABLE_IP_WHITELIST ? 'Enabled' : 'Disabled'}`);
  console.log(`   • Auto-shutdown: ${CONFIG.ENABLE_AUTO_SHUTDOWN ? CONFIG.AUTO_SHUTDOWN_HOURS + ' hours' : 'Disabled'}`);
  console.log('='.repeat(50));
});