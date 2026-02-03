/**
 * Story Video Generator - Server
 * REST API for generating 1-minute animated story videos
 */

const express = require('express');
const cors = require('cors');
const generator = require('./generator');
const renderer = require('./render-video');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/output', express.static(path.join(__dirname, 'output')));

// Debug: show paths
app.get('/debug', (req, res) => {
    res.json({
        __dirname: __dirname,
        outputDir: path.join(__dirname, 'output'),
        files: require('fs').readdirSync(path.join(__dirname, 'output') || [])
    });
});

// List files in output directory
app.get('/api/files', (req, res) => {
    const outputDir = path.join(__dirname, 'output');
    const files = require('fs').readdirSync(outputDir || '.');
    res.json({ directory: outputDir, files: files.slice(0, 20) });
});

// Download video file
app.get('/api/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const outputDir = path.join(__dirname, 'output');
    const filepath = path.join(outputDir, filename);

    if (require('fs').existsSync(filepath)) {
        res.download(filepath);
    } else {
        res.status(404).json({ error: 'File not found', path: filepath });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate video project
app.post('/api/generate', async (req, res) => {
    try {
        console.log('\n========================================');
        console.log('   New Video Generation Request');
        console.log('========================================');

        const project = await generator.generateVideo();

        res.json({
            success: true,
            project: {
                id: project.id,
                title: project.title,
                duration: project.settings.duration,
                resolution: `${project.settings.width}x${project.settings.height}`,
                segments: project.timeline.segments.length,
                hasNarration: project.audio.narration.length > 0,
                hasImages: project.timeline.intro.content !== undefined
            },
            files: {
                project: `/output/project-${project.id}.json`,
                subtitles: `/output/subtitles-${project.id}.srt`,
                story: `/output/story-${project.id}.txt`
            }
        });
    } catch (err) {
        console.error('Generation error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Render video
app.post('/api/render/:projectId', async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const projectPath = path.join(__dirname, 'output', `project-${projectId}.json`);
        const uploadGithub = req.query.upload !== 'false';

        if (!require('fs').existsSync(projectPath)) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const { outputPath, githubUrl } = await renderer.renderVideo(projectPath, uploadGithub);

        // Get filename from path
        const filename = path.basename(outputPath);

        res.json({
            success: true,
            video: outputPath,
            downloadUrl: `/api/download/${filename}`,
            githubUrl: githubUrl,
            message: githubUrl ? 'Video rendered and uploaded to GitHub!' : 'Video rendered (upload failed)'
        });
    } catch (err) {
        console.error('Render error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get project status
app.get('/api/status/:projectId', (req, res) => {
    const projectId = req.params.projectId;
    const outputDir = path.join(__dirname, 'output');

    const files = {
        project: `project-${projectId}.json`,
        subtitles: `subtitles-${projectId}.srt`,
        story: `story-${projectId}.txt`,
        video: `story_video_${projectId}.mp4`
    };

    const status = {};
    for (const [key, filename] of Object.entries(files)) {
        const filepath = path.join(outputDir, filename);
        status[key] = require('fs').existsSync(filepath);
    }

    res.json({ success: true, projectId, files: status });
});

// List recent projects
app.get('/api/projects', (req, res) => {
    const outputDir = path.join(__dirname, 'output');
    const fs = require('fs');

    if (!fs.existsSync(outputDir)) {
        return res.json({ success: true, projects: [] });
    }

    const projectFiles = fs.readdirSync(outputDir)
        .filter(f => f.startsWith('project-') && f.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, 10);

    const projects = projectFiles.map(filename => {
        const data = fs.readFileSync(path.join(outputDir, filename), 'utf8');
        const project = JSON.parse(data);
        return {
            id: project.id,
            title: project.title,
            created: filename.replace('project-', '').replace('.json', ''),
            duration: project.settings.duration
        };
    });

    res.json({ success: true, projects });
});

// Start server
app.listen(PORT, () => {
    console.log(`
========================================
   Story Video Generator API
========================================
Server running on http://localhost:${PORT}

API Endpoints:
- POST /api/generate  - Generate new video project
- POST /api/render/:id - Render video to MP4
- GET  /api/status/:id - Check project status
- GET  /api/projects  - List recent projects
- GET  /health        - Health check

Environment:
- OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set' : 'Not set'}
- FFmpeg: ${process.env.FFMPEG_PATH || 'Default'}

========================================
    `);
});

module.exports = app;
