# Story Video Generator (FREE)

Generate 1-minute animated story videos with **FREE** tools - no API keys required!

## Features

- **100% FREE** - No OpenAI API keys needed
- **Story Fetching**: Automatically fetches interesting stories from RSS feeds
- **FREE TTS**: Uses espeak-ng or macOS say command
- **FREE Images**: Uses ImageMagick or PIL (Python)
- **Subtitles**: Burned-in English subtitles (SRT format)
- **Subscribe Button**: Animated CTA at video end
- **Auto-Upload**: Videos automatically upload to GitHub `video/` folder
- **Vertical Format**: 9:16 aspect ratio (1080x1920) for Reels/Shorts

## Quick Start

### Install Dependencies

```bash
cd /workspaces/MoltbotAP/story-video
npm install
```

### Install FREE Tools (Optional)

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get install ffmpeg imagemagick espeak-ng
```

#### macOS
```bash
brew install ffmpeg imagemagick espeak-ng
```

### Generate a Video

```bash
# Generate and render video in one command
node server.js &
curl -X POST http://localhost:3000/api/auto-generate
```

## API Server

Start the REST API server:

```bash
npm start
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auto-generate` | ⭐ Generate + Render + Upload (ONE COMMAND) |
| POST | `/api/generate` | Generate story project only |
| POST | `/api/render/:projectId` | Render video to MP4 |
| GET | `/api/status/:projectId` | Check project status |
| GET | `/api/projects` | List recent projects |
| GET | `/api/files` | List output files |
| GET | `/health` | Health check |

### Example Usage

```bash
# Auto-generate (all in one)
curl -X POST http://localhost:3000/api/auto-generate

# Response:
# {
#   "success": true,
#   "githubUrl": "https://github.com/.../video/story_video_xxx.mp4",
#   "message": "Video generated and uploaded to GitHub!"
# }
```

## Auto-Upload to GitHub

To automatically upload generated videos to your GitHub repository:

### 1. Create GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select `repo` scope
4. Copy the token

### 2. Add Token to Railway

1. Go to https://railway.app
2. Open your project
3. Click "Variables"
4. Add: `GITHUB_TOKEN=your_token_here`

### 3. Videos Auto-Upload to:
```
https://github.com/yourusername/MoltbotAP-story-video/tree/main/video/
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

## Deployment to Railway

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
4. Select "Deploy from GitHub repo"
5. Select your repo
6. Railway will automatically detect the **Dockerfile** and install:
   - FFmpeg for video rendering
   - ImageMagick for image generation
   - Python3 for fallback image generation
   - Git for version control

7. Optional: Add `GITHUB_TOKEN` variable for auto-upload

### 3. Railway Configuration

The `Dockerfile` includes all required tools:
- FFmpeg (video rendering)
- ImageMagick (image generation)
- Python3 (fallback image generation)
- Git (version control)

### 4. Troubleshooting

If tools are not found, check:
1. Railway is using Dockerfile (not nixpacks)
2. Dockerfile exists in project root
3. Redeploy the service after changes

## Auto-Generate Cron Job

Automatically generate videos every 6 hours:

```bash
# Using OpenClaw cron
/cron add --schedule "0 */6 * * *" --payload "Call /api/auto-generate"
```

Or manually:
```bash
curl -X POST https://your-app.up.railway.app/api/auto-generate
```

## Requirements

- Node.js 18+
- FFmpeg (installed via Railway apt packages)
- ImageMagick (installed via Railway apt packages)
- GitHub Token (optional, for auto-upload)

## Project Structure

```
story-video/
├── server.js           # Express API server
├── generator.js        # Story fetching and script generation
├── render-video.js     # FFmpeg video rendering + GitHub upload
├── railway.json        # Railway deployment config
├── auto-generate.sh    # Quick generate script
├── cron-auto-generate.sh # Cron script for auto-generation
├── package.json        # Dependencies
├── .env.example        # Environment template
├── README.md           # This file
├── output/            # Generated files
└── video/            # Uploaded videos (GitHub)
```

## Troubleshooting

### FFmpeg not available
The system will create placeholder files. Install FFmpeg for MP4 output:
- Ubuntu: `sudo apt install ffmpeg`
- macOS: `brew install ffmpeg`

### ImageMagick not available
Images will use Python PIL fallback if available.

### GitHub upload failed
Check that `GITHUB_TOKEN` is set with `repo` scope.

## Future Enhancements

- [ ] Multiple language support
- [ ] Background music library (royalty-free)
- [ ] YouTube Upload API integration
- [ ] Template system for different styles

## License

MIT License
