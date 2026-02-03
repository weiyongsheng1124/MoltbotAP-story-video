# Story Video Generator Skill

*Generate 1-minute animated story videos with AI narration for YouTube Reels*

---

## Overview

This skill generates short-form story videos (9:16 vertical format) suitable for YouTube Shorts, TikTok, and Instagram Reels.

## Workflow

```
RSS Stories → AI Script → TTS Audio → Images → Video Render → Subscribe Button
```

## File Structure

```
story-video/
├── generator.js      # Main: fetches stories, creates project
├── renderer.js       # Video rendering with FFmpeg
├── README.md        # Documentation
├── package.json     # npm dependencies
└── output/          # Generated files
```

## Key Functions

### `generateVideo()`
Main entry point. Orchestrates the entire video creation process:
1. Fetches story from RSS
2. Summarizes content
3. Generates script
4. Creates project structure

### `summarizeStory(story)`
Cleans HTML, extracts key points, splits into 5 segments (~8 sec each)

### `generateSRT(script)`
Creates SRT subtitle format with timestamps

### `generateSubscribeAnimation()`
Creates animated subscribe button sequence

## Configuration

```javascript
const CONFIG = {
    RSS_SOURCES: [
        { name: 'Today I Found Out', url: '...' },
        { name: 'Listverse', url: '...' }
    ],
    VIDEO: {
        width: 1080,
        height: 1920,  // 9:16 for Reels
        fps: 30,
        duration: 60
    },
    TTS: {
        voice: 'alloy',
        model: 'tts-1',
        speed: 1.0
    }
};
```

## RSS Feed Format

Stories are parsed as:
```javascript
{
    title: string,
    link: string,
    description: string,
    pubDate: string,
    source: string
}
```

## Script Generation

The script is split into segments for timing:
- **Intro**: 3 seconds
- **5 Segments**: 8 seconds each (total 40 seconds)
- **Outro**: 7 seconds
- **Subscribe Animation**: 5 seconds
- **Buffer**: 5 seconds
- **Total**: ~60 seconds

## TTS Integration

Uses OpenAI TTS API:
```javascript
const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",  // or: echo, fable, onyx, nova, shimmer
    input: text,
    speed: 1.0
});
```

## Image Generation

DALL-E 3 prompt structure:
```
"Create a visually stunning background image for a story video segment about: {text}..."
```

Aspect ratio: 1024x1024 (will be cropped/resized for 9:16)

## Subscribe Button Animation

Sequence:
1. **0-1s**: Fade in + scale up (0% → 100%)
2. **1-3s**: Bounce effect (subtle up/down)
3. **3-4s**: "SUBSCRIBE!" text appears
4. **4-5s**: Bell icon wiggle + red pulse

## Video Rendering (FFmpeg)

Basic command structure:
```bash
ffmpeg \
  -loop 1 -t 5 -i slide1.png \
  -loop 1 -t 8 -i slide2.png \
  -i narration.mp3 \
  -i subtitles.srt \
  -filter_complex "[0:v][2:v]overlay; [v]subtitles=subs.srt[out]" \
  -map "[out]" \
  -map 1:a \
  -c:v libx264 -c:a aac \
  output.mp4
```

## Dependencies

```json
{
  "axios": "^1.6.0",
  "rss-parser": "^3.13.0",
  "openai": "^4.20.0",
  "fluent-ffmpeg": "^2.1.2"
}
```

## Usage

```bash
# Install
npm install

# Generate project (no rendering)
node generator.js

# Render video
node renderer.js project.json
```

## Output Files

| File | Description |
|------|-------------|
| `project-{id}.json` | Full project structure |
| `subtitles-{id}.srt` | Burned-in subtitles |
| `story-{id}.txt` | Story text + script |
| `video_{ts}.mp4` | Final rendered video |

## Common Issues

### No stories found
- Check RSS feeds are accessible
- Verify network connectivity
- Try different RSS sources

### TTS generation fails
- Verify OpenAI API key
- Check rate limits
- Reduce text length

### FFmpeg not found
- Install FFmpeg: `brew install ffmpeg` (macOS)
- Or: `apt install ffmpeg` (Linux)

## YouTube Reels Specs

| Setting | Value |
|--------|-------|
| Aspect Ratio | 9:16 |
| Resolution | 1080x1920 |
| Duration | 60 seconds |
| Frame Rate | 30 FPS |
| Format | MP4 (H.264) |

## Future Enhancements

- Multiple language support
- Custom voice templates
- Background music library
- Batch processing
- YouTube upload API
