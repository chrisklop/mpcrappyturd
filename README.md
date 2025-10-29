# Flappy Turd: Multiplayer Sewer Survival 🚽💩

A multiplayer version of the popular Flappy Turd game where players compete in real-time sewer survival action!

## Features

### Single Player
- Original Flappy Turd gameplay with full collision detection
- Dynamic obstacle generation (pipes, rats, gators)
- Animated sewer background
- Score tracking and game over on collision/fall
- Local high score tracking
- Customizable player emoji colors
- Sewer-themed sound effects

### Multiplayer (NEW!)
- Real-time multiplayer with 2-6 players
- Automatic matchmaking
- Full collision detection and game over mechanics
- Synchronized obstacle courses
- Live player positions and eliminations
- Score tracking for all players
- Global leaderboard
- Spectator mode
- Anti-cheat validation

## Quick Start (Local Development)

### Prerequisites
- Docker and Docker Compose
- Modern web browser

### 1. Start the Game
```bash
./start-local.sh
```

### 2. Test Everything Works
```bash
./test-game.sh
```

### 3. Play!
- **Single Player**: http://localhost:3000
- **Multiplayer**: http://localhost:3000/index-multiplayer.html

### 4. Test Multiplayer
1. Open multiple browser tabs/windows
2. Enter different Sewer Handles in each tab
3. Click "Multiplayer" in both tabs
4. Wait for sewer rats to join the lobby
5. Click "Ready" when all players have joined
6. Play and test that collisions work properly!

## Architecture

### Backend (Node.js + Socket.IO + Redis)
- **Game Server**: Real-time multiplayer coordination
- **Room Manager**: Player matchmaking and room management  
- **Game Manager**: Server-authoritative game logic and anti-cheat
- **Redis**: Game state and leaderboard persistence

### Frontend (HTML5 Canvas + Socket.IO)
- **Single Player Mode**: Original game experience
- **Multiplayer Mode**: Real-time synchronized gameplay
- **Network Manager**: Handles server communication and lag compensation
- **Multiplayer UI**: Lobby, ready states, live player tracking

### Infrastructure
- **Docker**: Containerized development environment
- **Nginx**: Web server and proxy for API routing
- **Redis**: Fast in-memory game state storage

## Game Modes

### Single Player
Classic Flappy Turd experience with local scoring.

### Multiplayer Elimination
- 2-6 players compete simultaneously
- Same obstacle course for all players
- Last player standing wins
- Real-time position updates
- Server-side collision validation

## API Endpoints

- `GET /api/health` - Server health check
- `GET /api/stats` - Global game statistics
- `POST /api/join-queue` - Join multiplayer matchmaking

## Development Commands

```bash
# Start services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart just the game server
docker-compose restart game-server

# Connect to Redis for debugging
docker-compose exec redis redis-cli
```

## Deployment to Vercel

### 1. Server Setup
The multiplayer server can be deployed as Vercel serverless functions:

```bash
# Convert to Vercel format
npm run build:vercel
```

### 2. Environment Variables
Set in Vercel dashboard:
- `REDIS_URL`: Redis connection string
- `NODE_ENV`: production

### 3. Deploy
```bash
vercel --prod
```

## File Structure

```
├── index.html              # Original single player game
├── index-multiplayer.html  # New multiplayer game
├── docker-compose.yml      # Local development setup
├── nginx.conf              # Web server configuration
├── start-local.sh          # Quick start script
├── server/                 # Backend multiplayer server
│   ├── server.js           # Main server with Socket.IO
│   ├── game-manager.js     # Game logic and anti-cheat
│   ├── room-manager.js     # Player matchmaking
│   ├── package.json        # Node.js dependencies
│   └── Dockerfile          # Container setup
└── vercel/                 # Vercel deployment files
    ├── api/                # Serverless functions
    └── vercel.json         # Deployment configuration
```

## Multiplayer Features

### Real-time Synchronization
- 60fps position updates
- Server-authoritative obstacle generation
- Lag compensation and prediction
- Smooth interpolation for network players

### Anti-Cheat System
- Server-side position validation
- Movement speed limits
- Score verification
- Connection monitoring

### Matchmaking
- Automatic room creation
- Player ready states
- Room cleanup and management
- Reconnection handling

## Customization

### Game Settings
Edit constants in the JavaScript files:
- `maxPlayersPerRoom`: Maximum players per game (default: 6)
- `gameTickRate`: Server update rate (default: 60fps)
- `obstacleSpeed`: Game difficulty progression

### Visual Themes
Modify CSS variables for different themes:
- Background colors
- UI styling
- Player emoji variations

## Troubleshooting

### Common Issues

**Connection Failed**
- Ensure Docker is running
- Check if ports 3000, 3001, 6379 are available
- Verify firewall settings

**Game Desync**
- Check network latency
- Restart game server: `docker-compose restart game-server`
- Clear browser cache

**Performance Issues**
- Reduce `gameTickRate` in game-manager.js
- Lower position update frequency
- Check Redis memory usage

### Debug Tools

**Server Logs**
```bash
docker-compose logs -f game-server
```

**Redis Inspection**
```bash
docker-compose exec redis redis-cli
> KEYS *
> GET room:room_id_here
```

**Network Debugging**
- Open browser dev tools
- Monitor WebSocket connections
- Check for error messages in console

## Contributing

1. Fork the repository
2. Create feature branch
3. Test locally with `./start-local.sh`
4. Submit pull request

## License

MIT License - Feel free to use for your own projects!

---

**Ready to compete in the sewer? May the best turd survive! 💩🏆**