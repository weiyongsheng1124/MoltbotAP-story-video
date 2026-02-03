# Story Video Generator

Generate 1-minute animated story videos with AI narration, subtitles, and subscribe button animation.

## Features

- 📖 **Story Fetching**: Automatically fetches interesting stories from RSS feeds
- 🎤 **AI Narration**: Uses OpenAI TTS for natural-sounding narration
- 🎨 **Image Generation**: DALL-E integration for custom visuals
- 💬 **Subtitles**: Burned-in subtitles in SRT format
- 🔔 **Subscribe Button**: Animated subscribe button at video end
- 📱 **Reels Ready**: 9:16 vertical video format (1080x1920)

## Project Structure

```
story-video/
├── generator.js      # Main story fetching and script generation
├── renderer.js       # Video rendering with FFmpeg
├── config.js         # Configuration settings
├── package.json      # Dependencies
├── README.md         # This file
└── output/          # Generated files
```

## Installation

```bash
npm install
```

## Configuration

Create `.env` file with your API keys:

```env
# OpenAI (for TTS)
OPENAI_API_KEY=your_openai_api_key

# OpenAI DALL-E (for images)
OPENAI_API_KEY=your_openai_api_key

# Optional: Custom RSS feeds
RSS_SOURCES=url1,url2,url3
```

## Usage

### Generate a Story Video Project

```bash
node generator.js
```

This will:
1. Fetch a random story from configured RSS feeds
2. Generate a video project with segments
3. Create SRT subtitle file
4. Save project JSON for rendering

### Render Video (requires FFmpeg)

```bash
node render.js
```

This will:
1. Generate TTS audio for narration
2. Generate/retrieve images
3. Create video with transitions
4. Add subscribe button animation
5. Mix background music

## Output Files

After generation, you'll find:

- `project-{id}.json` - Full video project structure
- `subtitles-{id}.srt` - Subtitles file
- `story-{id}.txt` - Story text and script
- `video_{timestamp}.mp4` - Final rendered video

## API Keys Required

| Service | Purpose | Required For |
|---------|---------|--------------|
| OpenAI | TTS narration | Audio generation |
| OpenAI DALL-E 3 | Image generation | Visuals |
| FFmpeg | Video rendering | Final compilation |

## RSS Sources

Default story sources:
- Today I Found Out (https://todayifoundout.com/feed/)
- Listverse (https://listverse.com/feed/)
- Weird History (https://weirdhistory.com/feed/)

## Video Specs

- **Resolution**: 1080 x 1920 (9:16 vertical)
- **Duration**: ~60 seconds
- **Frame Rate**: 30 FPS
- **Format**: MP4

## Animation Elements

### Subscribe Button Animation
- 0-1s: Fade in + scale up
- 1-3s: Subtle bounce
- 3-4s: "Subscribe!" text appears
- 4-5s: Bell icon wiggle

### Transitions
- Crossfade between slides
- Smooth text fades

## Development

```bash
# Install dependencies
npm install

# Run generator only (no video rendering)
node generator.js

# Test configuration
npm test
```

## Future Enhancements

- [ ] Multiple language support
- [ ] Custom voice selection
- [ ] Background music library
- [ ] Batch video generation
- [ ] YouTube upload API integration
- [ ] Template system for different video styles
