# 🔐 Secured Railway WebSocket Test Server

A production-ready, secured WebSocket server with authentication, rate limiting, connection management, and cost controls for testing WebSocket connections through CDN services like Fastly.

## 🛡️ Security Features

- ✅ **Token Authentication** - Secure access with configurable tokens
- ✅ **Connection Limits** - Prevent server overload (default: 10 max connections)
- ✅ **Connection Timeouts** - Auto-disconnect idle connections (default: 5 minutes)
- ✅ **Rate Limiting** - Prevent message spam (default: 10 messages/minute per IP)
- ✅ **IP Whitelist Support** - Restrict access to specific IPs (optional)
- ✅ **Auto-shutdown Timer** - Prevent runaway costs (default: 2 hours)
- ✅ **Comprehensive Logging** - Monitor all connections and security events
- ✅ **Admin Endpoints** - Remote monitoring and shutdown capabilities

## 💰 Cost Control Features

- ✅ **Auto-shutdown after X hours** to prevent excessive Railway bills
- ✅ **Connection limits** to control resource usage
- ✅ **Rate limiting** to prevent abuse
- ✅ **Health monitoring** with usage statistics
- ✅ **Manual shutdown endpoint** for emergency stops

## 🚀 Quick Deploy to Railway

### 1. Create Repository & Deploy

```bash
# Create new repository
git init
git add .
git commit -m "Initial secured WebSocket server"
git branch -M main
git remote add origin https://github.com/yourusername/secured-websocket-server.git
git push -u origin main

# Deploy on Railway
# Go to railway.app → Sign in → New Project → Deploy from GitHub repo
```

### 2. Configure Environment Variables

In Railway dashboard, set these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_TOKEN` | `test123` | Authentication token for connections |
| `MAX_CONNECTIONS` | `10` | Maximum concurrent connections |
| `CONNECTION_TIMEOUT_MINUTES` | `5` | Auto-disconnect timeout |
| `RATE_LIMIT_MESSAGES` | `10` | Messages per minute per IP |
| `AUTO_SHUTDOWN_HOURS` | `2` | Auto-shutdown after X hours |
| `ENABLE_AUTO_SHUTDOWN` | `true` | Enable/disable auto-shutdown |
| `ENABLE_IP_WHITELIST` | `false` | Enable IP whitelist filtering |
| `IP_WHITELIST` | `` | Comma-separated IPs (if enabled) |

### 3. Test Your Deployment

1. **Visit**: `https://your-app.railway.app`
2. **Enter token**: `test123` (or your custom token)
3. **Connect and test** the WebSocket functionality

## 📊 API Endpoints

### WebSocket Connection
```
wss://your-app.railway.app?token=your-auth-token
```

### HTTP Endpoints
- `GET /` - Secured test client interface
- `GET /health` - Health check with security stats
- `GET /admin/shutdown?token=AUTH_TOKEN` - Emergency shutdown
- `GET /admin/stats?token=AUTH_TOKEN` - Detailed server statistics

## 🔌 Connection Examples

### Browser JavaScript
```javascript
const ws = new WebSocket('wss://your-app.railway.app?token=test123');

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    
    if (data.type === 'welcome') {
        console.log('Server limits:', data.serverLimits);
        console.log('Max connections:', data.serverLimits.maxConnections);
        console.log('Rate limit:', data.serverLimits.rateLimit);
    }
};
```

### Node.js Client
```javascript
const WebSocket = require('ws');
const ws = new WebSocket('wss://your-app.railway.app?token=test123');

ws.on('open', function() {
    ws.send(JSON.stringify({
        text: 'Hello from Node.js!',
        timestamp: new Date().toISOString()
    }));
});
```

## 📨 Message Formats

### Welcome Message (Server → Client)
```json
{
  "type": "welcome",
  "clientId": 1,
  "message": "🔐 Connected to Secured Railway WebSocket Server",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "serverLimits": {
    "maxConnections": 10,
    "connectionTimeoutMinutes": 5,
    "rateLimit": {
      "maxMessages": 10,
      "perMinutes": 1
    },
    "autoShutdownHours": 2
  },
  "currentStats": {
    "activeConnections": 1,
    "yourIP": "192.168.1.1"
  }
}
```

### Echo Response (Server → Client)
```json
{
  "type": "echo",
  "clientId": 1,
  "originalMessage": { "text": "Hello" },
  "serverTimestamp": "2024-01-01T00:00:00.000Z",
  "activeConnections": 1,
  "yourMessageCount": 5
}
```

### Error Response (Server → Client)
```json
{
  "type": "error",
  "message": "Rate limit exceeded: 10 messages per minute",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🏥 Health Check Response

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": {
    "ms": 3600000,
    "hours": "1.00",
    "autoShutdownIn": 3600000
  },
  "connections": {
    "active": 3,
    "max": 10,
    "total_attempts": 15,
    "rejected": 2
  },
  "limits": {
    "maxConnections": 10,
    "connectionTimeoutMinutes": 5,
    "rateLimit": "10 messages per minute",
    "ipWhitelistEnabled": false,
    "autoShutdownHours": 2
  }
}
```

## 🔧 Configuration Guide

### Basic Security Setup
```bash
# Railway Environment Variables
AUTH_TOKEN=your-secret-token-here
MAX_CONNECTIONS=5
CONNECTION_TIMEOUT_MINUTES=3
RATE_LIMIT_MESSAGES=5
AUTO_SHUTDOWN_HOURS=1
```

### Production Setup
```bash
# More restrictive settings
AUTH_TOKEN=super-secure-random-token-here
MAX_CONNECTIONS=20
CONNECTION_TIMEOUT_MINUTES=10
RATE_LIMIT_MESSAGES=20
AUTO_SHUTDOWN_HOURS=4
ENABLE_IP_WHITELIST=true
IP_WHITELIST=203.0.113.1,203.0.113.2,203.0.113.3
```

### Development Setup
```bash
# More permissive for testing
AUTH_TOKEN=dev123
MAX_CONNECTIONS=50
CONNECTION_TIMEOUT_MINUTES=30
RATE_LIMIT_MESSAGES=100
ENABLE_AUTO_SHUTDOWN=false
```

## 🚨 Security Events Logged

The server logs all security-related events:

- ✅ **Successful connections** with client IP and ID
- ❌ **Rejected connections** (invalid token, rate limit, capacity)
- 🚫 **Rate limit violations** with IP addresses
- ⏰ **Connection timeouts** and cleanup
- 🔄 **Auto-shutdown events** and triggers
- 📊 **Connection statistics** and usage patterns

## 💡 Best Practices

### For Testing
1. **Use short auto-shutdown times** (1-2 hours) to prevent forgotten instances
2. **Set conservative connection limits** (5-10) for basic testing
3. **Use strong tokens** even for testing environments
4. **Monitor the health endpoint** regularly during tests

### For Production Use
1. **Use environment variables** for all sensitive configuration
2. **Enable IP whitelisting** if you know your client IPs
3. **Set appropriate rate limits** based on your use case
4. **Monitor Railway usage** and costs regularly
5. **Use admin endpoints** for remote management

## 🔗 Fastly CDN Integration

Once deployed, configure Fastly to proxy WebSocket traffic:

1. **Backend Configuration**:
   - Origin: `your-app.railway.app`
   - Port: `443` (HTTPS/WSS)
   - Protocol: `HTTPS`

2. **Header Configuration**:
   ```
   Connection: Upgrade
   Upgrade: websocket
   Sec-WebSocket-*: (pass through all)
   ```

3. **VCL Configuration** (if needed):
   ```vcl
   if (req.http.Upgrade ~ "websocket") {
       set req.backend = your_railway_backend;
   }
   ```

## 📈 Monitoring & Troubleshooting

### Check Server Status
```bash
curl https://your-app.railway.app/health
```

### Monitor Connections
```bash
# Check active connections
curl "https://your-app.railway.app/admin/stats?token=your-token"
```

### Emergency Shutdown
```bash
curl "https://your-app.railway.app/admin/shutdown?token=your-token"
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection rejected | Invalid token | Check AUTH_TOKEN environment variable |
| Rate limit exceeded | Too many messages | Wait 1 minute or increase RATE_LIMIT_MESSAGES |
| Connection timeout | Idle connection | Reconnect or increase CONNECTION_TIMEOUT_MINUTES |
| Server unavailable | Auto-shutdown triggered | Redeploy or increase AUTO_SHUTDOWN_HOURS |

## 💸 Cost Optimization

Railway charges based on:
- **vCPU usage** (per second)
- **Memory usage** (per second)
- **Network bandwidth** (per GB)

To minimize costs:
1. **Enable auto-shutdown** for testing environments
2. **Set low connection limits** to reduce memory usage
3. **Use rate limiting** to prevent bandwidth abuse
4. **Monitor usage** via health endpoint
5. **Shutdown manually** when not in use

## 🏗️ File Structure

```
project/
├── server.js          # Main secured WebSocket server
├── package.json       # Dependencies and Railway config
├── public/
│   └── index.html     # Secured test client with auth
└── README.md         # This documentation
```

## 🎯 Next Steps

After deployment:
1. ✅ **Test authentication** with your token
2. ✅ **Verify security limits** work as expected
3. ✅ **Configure Fastly** to proxy to your Railway endpoint
4. ✅ **Monitor costs** via Railway dashboard
5. ✅ **Set up alerts** for usage thresholds

Your secure WebSocket server is now ready for production testing with CDN integration! 🚀