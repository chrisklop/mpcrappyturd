# CRITICAL DEPLOYMENT DOCUMENTATION

## ⚠️ IMPORTANT: FILE STRUCTURE FOR VERCEL

**VERCEL SERVES `index.html` AS THE MAIN FILE - NOT ANY OTHER HTML FILE**

### File Structure:
- `index.html` = **PRODUCTION MULTIPLAYER GAME** (Vercel serves this)
- `simple-multiplayer.html` = Development copy (backup)
- `index-multiplayer.html` = Old development version (DO NOT USE)
- `working-game.html` = Single player test version
- `test-timing.html` = Timing test version

### **NEVER EDIT ANY FILE OTHER THAN `index.html` FOR PRODUCTION CHANGES**

## Current Status:
- ✅ `index.html` contains full multiplayer game
- ✅ Lobby system with Force Start button (2+ players)
- ✅ API endpoints at `/api/rooms.js` working
- ✅ Both single player and multiplayer modes
- ❌ **CURRENT ISSUE: Player falls immediately when game starts - need gravity delay**

## Gravity Issue:
Player should float/hover until first click AFTER the game begins, but currently falls immediately.

## Production URL:
https://mpcrappyturd-514nj0z84-chrisklopfenstein-3464s-projects.vercel.app

## Git Commands Used:
```bash
git add . && git commit -m "message"
git push
vercel --prod
```

**DO NOT REVERT TO OTHER HTML FILES WITHOUT EXPLICIT USER COMMAND**