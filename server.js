const WebSocket = require('ws');
const express = require('express');
const path = require('path');

// Create Express app for serving static files and health checks
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (for our test client)
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    connections: wss.clients.size 
  });
});

// Serve test client at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create HTTP server
const server = require('http').createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Connection counter for testing
let connectionCount = 0;

wss.on('connection', (ws, req) => {
  connectionCount++;
  const clientId = connectionCount;
  const clientIP = req.socket.remoteAddress;
  
  console.log(`[${new Date().toISOString()}] Client ${clientId} connected from ${clientIP}`);
  console.log(`Active connections: ${wss.clients.size}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    clientId: clientId,
    message: 'Connected to Railway WebSocket Test Server',
    timestamp: new Date().toISOString()
  }));

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`[${new Date().toISOString()}] Client ${clientId} sent:`, message);

      // Echo the message back with additional info
      const response = {
        type: 'echo',
        clientId: clientId,
        originalMessage: message,
        serverTimestamp: new Date().toISOString(),
        activeConnections: wss.clients.size
      };

      ws.send(JSON.stringify(response));
    } catch (error) {
      // Handle non-JSON messages
      console.log(`[${new Date().toISOString()}] Client ${clientId} sent raw:`, data.toString());
      
      const response = {
        type: 'echo',
        clientId: clientId,
        originalMessage: data.toString(),
        serverTimestamp: new Date().toISOString(),
        activeConnections: wss.clients.size
      };

      ws.send(JSON.stringify(response));
    }
  });

  // Handle connection close
  ws.on('close', (code, reason) => {
    console.log(`[${new Date().toISOString()}] Client ${clientId} disconnected. Code: ${code}, Reason: ${reason}`);
    console.log(`Active connections: ${wss.clients.size}`);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] Client ${clientId} error:`, error);
  });

  // Send periodic heartbeat (optional, for testing connection stability)
  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      }));
    } else {
      clearInterval(heartbeat);
    }
  }, 30000); // Every 30 seconds
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Test client: http://localhost:${PORT}`);
});