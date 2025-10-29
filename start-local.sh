#!/bin/bash

echo "🚀 Starting Flappy Turd Multiplayer Local Development"
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Build and start services
echo "🐳 Building and starting Docker containers..."
docker-compose up --build -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."

# Check Redis
if docker-compose exec redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "❌ Redis failed to start"
fi

# Check Game Server
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Game Server is running"
else
    echo "❌ Game Server failed to start"
fi

# Check Nginx
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Web Server is running"
else
    echo "❌ Web Server failed to start"
fi

echo ""
echo "🎮 Flappy Turd Multiplayer is ready!"
echo "=================================================="
echo "🌐 Open your browser and go to:"
echo "   Single Player: http://localhost:3000"
echo "   Multiplayer:   http://localhost:3000/index-multiplayer.html"
echo ""
echo "💡 To test multiplayer, open multiple browser tabs/windows"
echo "🔧 Server API: http://localhost:3001/api/health"
echo "📊 Game Stats: http://localhost:3001/api/stats"
echo ""
echo "🛑 To stop: docker-compose down"
echo "📋 View logs: docker-compose logs -f"