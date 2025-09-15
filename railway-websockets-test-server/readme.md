# Railway WebSocket Test Server

A simple WebSocket server designed for testing WebSocket connections through CDN services like Fastly.

## Features

- ✅ WebSocket server with echo functionality
- ✅ Built-in test client (web interface)
- ✅ Health check endpoint
- ✅ Connection logging and monitoring
- ✅ Heartbeat messages for connection testing
- ✅ Railway deployment ready

## Quick Deploy to Railway

### Option 1: Deploy from GitHub (Recommended)

1. **Create a new repository** on GitHub and push this code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

2. **Deploy on Railway**:
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will automatically detect it's a Node.js app and deploy it

3. **Get your URL**:
   - After deployment, Railway provides a URL like: `https://your-app-name.railway.app`
   - Your WebSocket endpoint will be: `wss://your-app-name.railway.app`

### Option 2: Railway CLI

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Deploy**:
   ```bash
   railway login
   railway init
   railway up
   ```

## File Structure

```
project/
├── server.js          # Main WebSocket server
├── package.json       # Dependencies and scripts
├── public/
│   └── index.html     # Test client interface
└── README.md         # This file
```

## Testing Your Deployment

1. **Direct Test**: Visit your Railway URL (e.g., `https://your-app.railway.app`)
2. **Health Check**: Visit `https://your-app.railway.app/health`
3. **WebSocket Test**: Use the built-in client or connect directly to `wss://your-app.railway.app`

## API Endpoints

- `GET /` - Test client interface
- `GET /health` - Health check (returns connection count)
- `WebSocket /` - WebSocket endpoint for connections

## WebSocket Message Format

### Client → Server
```json
{
  "id": 1,
  "text": "Your message",
  "clientTimestamp": "2024-01-01T00:00:00.000Z"
}
```

### Server → Client
```json
{
  "type": "echo",
  "clientId": 1,
  "originalMessage": { /* your original message */ },
  "serverTimestamp": "2024-01-01T00:00:00.000Z",
  "activeConnections": 1
}
```

## Configuring with Fastly

Once deployed, you can configure Fastly to proxy WebSocket traffic:

1. **Add Backend**: Point to your Railway URL
2. **Configure Headers**: Ensure WebSocket headers are passed through:
   - `Connection: Upgrade`
   - `Upgrade: websocket`
   - `Sec-WebSocket-*` headers
3. **Set Timeouts**: Configure appropriate timeout values for persistent connections

## Environment Variables

The server uses these environment variables:

- `PORT` - Port to run on (Railway sets this automatically)

## Logs and Monitoring

Railway provides built-in logging. Your WebSocket server logs:
- New connections with client ID and IP
- All incoming/outgoing messages
- Connection closures and errors
- Active connection counts

## Testing Full Chain

1. **Deploy this server** to Railway
2. **Create your web app** (can be static HTML served via Fastly CDN)
3. **Configure Fastly** to proxy WebSocket connections to Railway
4. **Test**: Web App → Fastly → Railway WebSocket Server

## Troubleshooting

- **Connection Failed**: Check if Railway app is running via health endpoint
- **WebSocket Upgrade Failed**: Verify Fastly passes WebSocket headers
- **Timeout Issues**: Check Railway logs for connection problems
- **SSL Issues**: Ensure you're using `wss://` for HTTPS origins

## Cost

Railway free tier includes:
- $5 credit monthly (refreshes each month)
- Should be more than sufficient for testing purposes
- No traffic charges for low-volume testing

## Next Steps

After deployment, you'll have:
1. ✅ A working WebSocket server at `wss://your-app.railway.app`
2. ✅ A test interface at `https://your-app.railway.app`
3. ✅ Health monitoring at `https://your-app.railway.app/health`

Ready to configure with your Fastly CDN setup!