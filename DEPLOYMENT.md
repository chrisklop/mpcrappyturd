# Deployment Guide 🚀

## Local Testing (Docker)

### Quick Start
```bash
./start-local.sh
```

### Manual Setup
```bash
# Start services
docker-compose up --build -d

# Test
open http://localhost:3000/index-multiplayer.html

# Stop
docker-compose down
```

## Vercel Deployment

### Prerequisites
- Vercel account connected to GitHub
- Redis database (Upstash recommended for free tier)

### 1. Prepare Repository
```bash
# Add all files to git
git add .
git commit -m "Add multiplayer functionality"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: GitHub Integration (Recommended)
1. Connect repository to Vercel dashboard
2. Set environment variables (see below)
3. Deploy automatically on push

#### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### 3. Environment Variables
Set these in Vercel dashboard:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `REDIS_URL` | `redis://...` | Redis connection string (optional) |

### 4. Custom Domain (Optional)
1. Add domain in Vercel dashboard
2. Update DNS records
3. SSL automatically configured

## Embedding on crappysigns.com

### Option 1: iFrame Embed
```html
<iframe 
    src="https://your-app.vercel.app/index-multiplayer.html"
    width="400" 
    height="600"
    frameborder="0">
</iframe>
```

### Option 2: Direct Integration
```html
<!-- Include Socket.IO -->
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>

<!-- Include game files -->
<link rel="stylesheet" href="https://your-app.vercel.app/game-styles.css">
<script src="https://your-app.vercel.app/multiplayer-game.js"></script>

<!-- Game container -->
<div id="flappy-turd-game"></div>
```

### Option 3: Subdomain
Point subdomain to Vercel:
- `game.crappysigns.com` → Vercel app
- Clean URLs and full control

## Configuration Options

### Game Settings
Edit `index-multiplayer.html`:
```javascript
// Maximum players per room
const maxPlayersPerRoom = 6;

// Game difficulty
const difficultyMultiplier = 1.0;

// Server URL (auto-detected)
const SERVER_URL = window.location.origin;
```

### Branding
```css
/* Custom colors */
:root {
    --primary-color: #27ae60;
    --secondary-color: #e74c3c;
    --background-color: #2c3e50;
}
```

## Monitoring & Analytics

### Built-in Stats
- Global leaderboard
- Game statistics
- Player counts

### API Endpoints
- `GET /api/health` - Server status
- `GET /api/stats` - Game statistics

### Custom Analytics
Add Google Analytics or similar:
```html
<!-- Add to <head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>
```

## Scaling Considerations

### Current Setup (Good for 100+ concurrent players)
- Vercel serverless functions
- In-memory game state
- Auto-scaling

### High Traffic (1000+ concurrent players)
- Dedicated Redis instance
- Multiple Vercel regions
- CDN for static assets

### Enterprise (10,000+ concurrent players)
- Dedicated game servers
- Database clustering
- Load balancing

## Troubleshooting

### Common Issues

**Socket.IO Connection Failed**
```javascript
// Check browser console for errors
// Verify CORS settings in api/socket.js
```

**Game Desync**
```javascript
// Increase position validation tolerance
// Check network latency
```

**Performance Issues**
```javascript
// Reduce tick rate
// Optimize rendering loop
// Check memory usage
```

### Debug Tools
```bash
# Local logs
docker-compose logs -f game-server

# Vercel logs
vercel logs
```

## Security Notes

### Current Implementation
- Basic position validation
- Rate limiting on updates
- Input sanitization

### Production Recommendations
- Add authentication for private rooms
- Implement advanced anti-cheat
- Monitor for abuse patterns
- Set up DDoS protection

## Support

### Issues
Report bugs at: https://github.com/your-username/flappy-turd/issues

### Feature Requests
- Tournament mode
- Private rooms
- Player statistics
- Mobile app

---

**Ready to launch! 🎮💩**