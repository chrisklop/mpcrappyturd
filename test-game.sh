#!/bin/bash

echo "🎮 Testing Flappy Turd Games"
echo "============================"

# Check if Docker services are running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ Game server not running. Start with: ./start-local.sh"
    exit 1
fi

echo "✅ Game server is running"

# Test original single player game
if curl -s http://localhost:3000 | grep -q "Sewer Survival"; then
    echo "✅ Original single player game is working"
else
    echo "❌ Original single player game has issues"
fi

# Test multiplayer game
if curl -s http://localhost:3000/index-multiplayer.html | grep -q "Multiplayer Sewer Survival"; then
    echo "✅ Multiplayer game is working"
else
    echo "❌ Multiplayer game has issues"
fi

# Test API endpoints
if curl -s http://localhost:3001/api/health | grep -q "ok"; then
    echo "✅ Game server API is working"
else
    echo "❌ Game server API has issues"
fi

echo ""
echo "🌐 Test the games:"
echo "Single Player: http://localhost:3000"
echo "Multiplayer:   http://localhost:3000/index-multiplayer.html"
echo ""
echo "💡 For multiplayer testing:"
echo "1. Open multiple browser tabs/windows"
echo "2. Enter different Sewer Handles"
echo "3. Click 'Multiplayer' in both tabs"
echo "4. Click 'Ready' when all sewer rats joined"
echo "5. Play and test collision detection!"