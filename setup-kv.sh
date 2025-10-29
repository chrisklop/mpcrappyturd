#!/bin/bash

echo "🚀 Setting up Vercel KV integration"
echo "=================================="

# Backup original files
echo "📦 Backing up original API files..."
if [ ! -d "api/backup" ]; then
    mkdir -p api/backup
fi

cp api/socket.js api/backup/socket-original.js 2>/dev/null || echo "socket.js not found"
cp api/stats.js api/backup/stats-original.js 2>/dev/null || echo "stats.js not found"  
cp api/join-queue.js api/backup/join-queue-original.js 2>/dev/null || echo "join-queue.js not found"

# Replace with KV versions
echo "🔄 Switching to KV-enabled versions..."
cp api/kv-socket.js api/socket.js
cp api/kv-stats.js api/stats.js  
cp api/kv-join-queue.js api/join-queue.js

# Update package.json to include KV dependency
echo "📦 Adding Vercel KV dependency..."
if ! grep -q "@vercel/kv" package.json; then
    # Add @vercel/kv to dependencies
    sed -i.bak 's/"uuid": "^9.0.1"/"uuid": "^9.0.1",\n    "@vercel\/kv": "^0.2.0"/' package.json
    rm package.json.bak 2>/dev/null || true
fi

echo ""
echo "✅ KV integration ready!"
echo ""
echo "Next steps:"
echo "1. Commit and push to GitHub:"
echo "   git add ."
echo "   git commit -m 'Add Vercel KV integration'"
echo "   git push"
echo ""
echo "2. In Vercel dashboard:"
echo "   - Go to Storage tab"
echo "   - Create KV Database named 'flappy-turd-kv'"
echo "   - Redeploy your project"
echo ""
echo "3. Test the enhanced multiplayer!"
echo ""
echo "🎮 Your game will now have:"
echo "✅ Persistent multiplayer rooms"
echo "✅ Reliable player tracking"
echo "✅ Global leaderboards"
echo "✅ Accurate online counts"