#!/bin/bash

echo "🚀 Automated Vercel Deployment for Flappy Turd"
echo "=============================================="

# Check if git is configured
if ! git config user.email > /dev/null; then
    echo "⚠️  Setting up git identity..."
    echo "📧 What's your email for git commits?"
    read -p "Email: " email
    echo "👤 What's your name for git commits?"
    read -p "Name: " name
    
    git config user.email "$email"
    git config user.name "$name"
    echo "✅ Git identity configured"
fi

echo ""
echo "🌐 Opening browser tabs for you to authenticate..."
echo "================================================"

# Open GitHub new repository page
echo "📦 Opening GitHub to create repository..."
open "https://github.com/new"

echo ""
echo "⏳ Waiting 10 seconds for you to create the GitHub repo..."
sleep 3
echo "⏳ 7 seconds..."
sleep 3  
echo "⏳ 4 seconds..."
sleep 3
echo "⏳ 1 second..."
sleep 1

echo ""
echo "📝 Please follow these steps in the browser tabs:"
echo ""
echo "🔹 GITHUB TAB:"
echo "   1. Repository name: flappy-turd-multiplayer"
echo "   2. Description: Multiplayer Flappy Turd with real-time sewer survival"
echo "   3. Set to Public (or Private if you prefer)"
echo "   4. Click 'Create repository'"
echo "   5. Copy the 'git remote add origin' command"
echo ""

# Wait for user to create GitHub repo
echo "Press ENTER when you've created the GitHub repository and copied the git remote command..."
read -p ""

echo ""
echo "📝 Paste the git remote command here (should start with 'git remote add origin'):"
read -p "Command: " remote_command

# Execute the remote command
echo "🔗 Adding GitHub remote..."
$remote_command

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
else
    echo "❌ Failed to push to GitHub. Please check the remote URL and try again."
    exit 1
fi

echo ""
echo "🌐 Opening Vercel dashboard..."
open "https://vercel.com/dashboard"

echo ""
echo "📝 VERCEL SETUP STEPS:"
echo "====================="
echo ""
echo "🔹 IN VERCEL DASHBOARD:"
echo "   1. Click 'New Project'"
echo "   2. Import your 'flappy-turd-multiplayer' repository"
echo "   3. Click 'Deploy' (don't change any settings)"
echo "   4. Wait for deployment to complete"
echo ""
echo "🔹 ENABLE VERCEL KV:"
echo "   1. Go to your project dashboard"
echo "   2. Click 'Storage' tab"
echo "   3. Click 'Create Database'"
echo "   4. Choose 'KV'"
echo "   5. Name: flappy-turd-kv"
echo "   6. Click 'Create'"
echo "   7. Click 'Redeploy' in your project"
echo ""
echo "🎮 After deployment, your game will be live at:"
echo "   https://YOUR-PROJECT-NAME.vercel.app/index-multiplayer.html"
echo ""
echo "✨ Features that will work:"
echo "   ✅ Single player (perfect)"
echo "   ✅ Multiplayer with persistent rooms"
echo "   ✅ Lobby timer and online counts"
echo "   ✅ Epic fart sounds 💨"
echo "   ✅ Global leaderboards"
echo "   ✅ Mobile responsive"
echo ""
echo "🚽💩 Ready for crappysigns.com embedding!"

echo ""
echo "Press ENTER when you're done with Vercel setup to see final instructions..."
read -p ""

echo ""
echo "🎯 FINAL STEPS:"
echo "==============="
echo ""
echo "✅ Your game is now deployed!"
echo ""
echo "🔗 To embed on crappysigns.com, use:"
echo "   <iframe src=\"https://YOUR-PROJECT-NAME.vercel.app/index-multiplayer.html\" "
echo "           width=\"400\" height=\"600\" frameborder=\"0\"></iframe>"
echo ""
echo "🧪 Test your deployment:"
echo "   1. Open your Vercel URL"
echo "   2. Try both single and multiplayer modes"
echo "   3. Open multiple tabs to test multiplayer"
echo ""
echo "🎮 Your friend can now embed this on crappysigns.com!"
echo ""
echo "All done! 🎉"