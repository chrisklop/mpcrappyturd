# 💨 Epic Fart Sound System

## 🎵 **What I Created**

Replaced the boring "crash sound" with a **realistic synthetic fart sound** using Tone.js!

## 🔧 **Technical Implementation**

### **Sound Components:**
1. **Brown Noise Synth** - Base fart texture
2. **Low-Pass Filter** (80Hz) - Muffled, realistic quality  
3. **Distortion** (40%) - Extra grossness factor
4. **LFO Modulation** (8Hz) - Classic fart wobble
5. **Low-Frequency Rumble** (60Hz sawtooth) - Deep bass
6. **Dynamic Pitch Bends** - Realistic fart variations

### **Sound Chain:**
```
Brown Noise → Low-Pass Filter → Distortion → Speakers
     ↑             ↑
   LFO Wobble   Dynamic Pitch
```

### **Timing:**
- **Attack**: 2ms (quick start)
- **Sustain**: 300ms (main fart)
- **Pitch bends**: 50ms & 150ms (realistic variations)
- **Total duration**: ~400ms

## 🎮 **When It Plays**

The fart sound triggers when:
- Player hits an obstacle
- Player falls off the screen
- Game over occurs

## 💻 **Still Single HTML File!**

✅ **Yes!** It's still one HTML file with no external audio dependencies
- Uses Tone.js library (already loaded from CDN)
- All sound generation is synthetic/code-based
- No audio files needed
- Works in all modern browsers

## 🧪 **Test the Fart**

1. **Open**: http://localhost:3000/index-multiplayer.html
2. **Play** either single or multiplayer mode
3. **Crash** into an obstacle or fall off screen
4. **Enjoy** the epic fart sound! 💨

## 🎚️ **Sound Quality**

The fart sound includes:
- **Realistic brown noise texture**
- **Muffled low-frequency filtering** 
- **Bubbly LFO modulation**
- **Deep bass rumble component**
- **Dynamic pitch variations**
- **Proper attack/release timing**

## 🔊 **Audio Engineering Notes**

- **Frequency Range**: 40-120Hz (classic fart spectrum)
- **Distortion**: Adds harmonic complexity
- **Filter Modulation**: Creates realistic pitch wobbles
- **Multi-layered**: Combines noise + oscillator + effects
- **Browser Compatible**: Works with Web Audio API

Perfect for embedding on **crappysigns.com**! 🚽💩🎮