# Story Video Generator (FREE)

Generate 1-minute animated story videos with **FREE** tools - no API keys required!

## Features

- **100% FREE** - No OpenAI API keys needed
- **Story Fetching**: Automatically fetches interesting stories from RSS feeds
- **FREE TTS**: Uses espeak-ng or macOS say command
- **FREE Images**: Uses ImageMagick or PIL (Python)
- **Subtitles**: Burned-in English subtitles (SRT format)
- **Subscribe Button**: Animated CTA at video end
- **Vertical Format**: 9:16 aspect ratio (1080x1920) for Reels/Shorts

## Quick Start

### Install Dependencies

```bash
cd /workspaces/MoltbotAP/story-video
npm install
```

### Install FREE Tools (Optional but recommended)

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get install ffmpeg imagemagick espeak-ng
```

#### macOS
```bash
brew install ffmpeg imagemagick espeak-ng
```

#### Windows
- FFmpeg: https://ffmpeg.org/download.html
- ImageMagick: https://imagemagick.org/script/download.php
- espeak-ng: https://github.com/espeak-ng/espeak-ng/releases

### Generate a Video

```bash
# Generate story project
node generator.js

# Render video (requires FFmpeg)
node render-video.js
```

## API Server

Start the REST API server:

```bash
npm start
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate` | Generate new video project |
| POST | `/api/render/:projectId` | Render video to MP4 |
| GET | `/api/status/:projectId` | Check project status |
| GET | `/api/projects` | List recent projects |
| GET | `/health` | Health check |

### Example Usage

```bash
# Generate video
curl -X POST http://localhost:3000/api/generate

# Render it
curl -X POST http://localhost:3000/api/render/[project-id]
```

## RSS Story Sources

Default sources (English stories):
- Today I Found Out (https://todayifoundout.com/feed/)
- Listverse (https://listverse.com/feed/)
- Weird History (https://weirdhistory.com/feed/)

## Video Structure

```
60-second video:
├── 0-3s    : Intro (title slide)
├── 3-48s   : 6 story segments (~7.5s each)
├── 48-57s  : Outro (CTA)
└── 57-60s  : Subscribe button animation
```

### Subscribe Button Animation

Animated CTA sequence:
- **0-1s**: Scale-up bounce effect
- **1-3s**: Gentle floating animation
- **3-4s**: "SUBSCRIBE!" text appears
- **4-5s**: Golden bell wiggle animation

## Installation on Railway

### 1. Create GitHub Repo
```bash
git init
git add -A
git commit -m "Initial commit"
gh repo create MoltbotAP-story-video --public
git push origin main
```

### 2. Deploy to Railway

1. Go to https://railway.app
2. Login with GitHub
3. Click "New Project"
4. Select your repo
5. No environment variables needed (100% FREE!)

### 3. Install FFmpeg on Railway

Add to `railway.json`:
```json
{
  "build": {
    "nixpacks": {
      "aptPackages": ["ffmpeg", "imagemagick", "espeak-ng"]
    }
  }
}
```

## Requirements

- Node.js 18+
- FFmpeg (optional, for MP4 rendering)
- ImageMagick (optional, for image generation)
- espeak-ng (optional, for TTS)

## Project Structure

```
story-video/
├── server.js          # Express API server
├── generator.js       # Story fetching and script generation
├── render-video.js    # FFmpeg video rendering
├── railway.json       # Railway deployment config
├── package.json       # Dependencies
├── .env.example       # Environment template
├── README.md          # This file
└── output/           # Generated files
```

## Troubleshooting

### FFmpeg not available
The system will create placeholder files. Install FFmpeg for MP4 output:
- Ubuntu: `sudo apt install ffmpeg`
- macOS: `brew install ffmpeg`

### ImageMagick not available
Images will use Python PIL fallback if available.

### espeak-ng not available
TTS will use placeholder audio files.

## Future Enhancements

- [ ] Multiple language support
- [ ] Background music library (royalty-free)
- [ ] Batch video generation
- [ ] YouTube Upload API integration
- [ ] Template system for different styles

## License

MIT License
