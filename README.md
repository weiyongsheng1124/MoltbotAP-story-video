# Story Video Generator

Generate 1-minute animated story videos with AI narration, subtitles, and animated subscribe button. Perfect for YouTube Shorts, Instagram Reels, and TikTok.

## Features

- **Story Fetching**: Automatically fetches interesting stories from RSS feeds
- **AI Narration**: Uses OpenAI TTS for natural-sounding English narration
- **Image Generation**: DALL-E 3 integration for custom visuals
- **Subtitles**: Burned-in English subtitles (SRT format)
- **Subscribe Button**: Animated CTA at video end with bounce and bell wiggle
- **Vertical Format**: 9:16 aspect ratio (1080x1920) optimized for Reels/Shorts

## Quick Start

### 1. Install Dependencies

```bash
cd /workspaces/MoltbotAP/story-video
npm install
```

### 2. Configure API Keys

Copy `.env.example` to `.env` and add your OpenAI API key:

```bash
cp .env.example .env
# Edit .env and add OPENAI_API_KEY
```

### 3. Generate a Video

```bash
# Start the API server
npm start

# Or generate directly
node generator.js
```

### 4. Render Video (requires FFmpeg)

```bash
# Install FFmpeg first
sudo apt-get install ffmpeg

# Render the video
node render-video.js
```

## API Endpoints

### POST /api/generate

Generate a new video project with story, script, images, and audio.

```bash
curl -X POST http://localhost:3000/api/generate
```

Response:
```json
{
  "success": true,
  "project": {
    "id": "uuid",
    "title": "Story Title",
    "duration": 60,
    "resolution": "1080x1920",
    "segments": 6,
    "hasNarration": true,
    "hasImages": true
  },
  "files": {
    "project": "/output/project-uuid.json",
    "subtitles": "/output/subtitles-uuid.srt",
    "story": "/output/story-uuid.txt"
  }
}
```

### POST /api/render/:projectId

Render the video to MP4 format.

```bash
curl -X POST http://localhost:3000/api/render/[project-id]
```

### GET /api/status/:projectId

Check project rendering status.

```bash
curl http://localhost:3000/api/status/[project-id]
```

### GET /api/projects

List recent projects.

```bash
curl http://localhost:3000/api/projects
```

## Output Files

After generation, the following files are created in `./output/`:

| File | Description |
|------|-------------|
| `project-{id}.json` | Full video project structure |
| `subtitles-{id}.srt` | Subtitles file for burning in |
| `story-{id}.txt` | Original story and script |
| `image_*.png` | Generated slides |
| `narration_*.mp3` | AI narration audio |
| `story_video_*.mp4` | Final rendered video |

## Video Structure

```
60-second video:
├── 0-3s    : Intro (title slide + hook)
├── 3-48s   : 6 story segments (~7.5s each)
├── 48-57s  : Outro (CTA)
└── 57-60s  : Subscribe button animation
```

### Subscribe Button Animation

The animated subscribe CTA features:
- **0-1s**: Scale-up bounce effect
- **1-3s**: Subtle floating animation
- **3-4s**: "Subscribe!" text appears
- **4-5s**: Golden bell wiggle + "for more stories!" text
- **5s+**: Arrow pointing to subscribe button

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | OpenAI API key for TTS and DALL-E |
| `PORT` | 3000 | Server port |
| `VIDEO_WIDTH` | 1080 | Output video width |
| `VIDEO_HEIGHT` | 1920 | Output video height |
| `VIDEO_FPS` | 30 | Frames per second |
| `VIDEO_DURATION` | 60 | Video duration in seconds |
| `TTS_VOICE` | alloy | OpenAI TTS voice |
| `TTS_MODEL` | tts-1 | OpenAI TTS model |
| `TTS_SPEED` | 1.0 | Speech speed (0.25-4.0) |

### Available TTS Voices

- `alloy` - Neutral, versatile
- `echo` - Soft, warm
- `fable` - British accent
- `onyx` - Deep, authoritative
- `nova` - Energetic, bright
- `shimmer` - Smooth, melodic

## RSS Story Sources

Default story sources (English):
- Today I Found Out (https://todayifoundout.com/feed/)
- Listverse (https://listverse.com/feed/)
- Weird History (https://weirdhistory.com/feed/)

Add more sources in `generator.js`:
```javascript
RSS_SOURCES: [
    { name: 'Your Source', url: 'https://example.com/feed/' },
    // ...
]
```

## Development

```bash
# Install dependencies
npm install

# Generate project only (no video rendering)
node generator.js

# Test configuration
npm test

# Run API server
npm start
```

## Requirements

- Node.js 18+
- OpenAI API key (for TTS and DALL-E)
- FFmpeg (for video rendering)

## Project Structure

```
story-video/
├── server.js          # Express API server
├── generator.js       # Story fetching and script generation
├── render-video.js    # FFmpeg video rendering
├── package.json       # Dependencies
├── .env.example       # Environment template
├── README.md          # Documentation
└── output/           # Generated files
```

## Future Enhancements

- [ ] Multiple language support (Chinese, Spanish, etc.)
- [ ] Custom voice selection via API
- [ ] Background music library
- [ ] Batch video generation
- [ ] YouTube Upload API integration
- [ ] Template system for different video styles
- [ ] Story search/filter by topic

## License

MIT License
