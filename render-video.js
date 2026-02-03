/**
 * Story Video Renderer - Simple PNG + FFmpeg concat
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
require('dotenv').config();

const CONFIG = {
    VIDEO: { width: 1080, height: 1920, fps: 30 },
    OUTPUT_DIR: path.join(__dirname, 'output'),
    GITHUB_REPO: 'weiyongsheng1124/MoltbotAP-story-video',
    VIDEO_DIR: 'video'
};

// GitHub upload
async function uploadToGitHub(filepath, commitMessage) {
    const axios = require('axios');
    const filename = path.basename(filepath);
    const destPath = path.join(CONFIG.VIDEO_DIR, filename);
    const fileContent = fs.readFileSync(filepath, 'base64');
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;

    if (!githubToken) return null;
    const [owner, repoName] = CONFIG.GITHUB_REPO.split('/');

    try {
        let sha = null;
        try {
            const existing = await axios.get(
                `https://api.github.com/repos/${owner}/${repoName}/contents/${destPath}`,
                { headers: { Authorization: `token ${githubToken}` } }
            );
            sha = existing.data.sha;
        } catch {}

        const response = await axios.put(
            `https://api.github.com/repos/${owner}/${repoName}/contents/${destPath}`,
            { message: commitMessage, content: fileContent, sha },
            { headers: { Authorization: `token ${githubToken}` } }
        );
        return response.data.content.download_url;
    } catch (err) {
        return null;
    }
}

// Check tools
function checkTools() {
    const tools = { ffmpeg: false, espeak: false };
    try { execSync('ffmpeg -version', { stdio: 'ignore' }); tools.ffmpeg = true; } catch {}
    try { execSync('espeak-ng --version', { stdio: 'ignore' }); tools.espeak = true; } catch {}
    return tools;
}

const TOOLS = checkTools();

// Create colored PNG using FFmpeg
function createSlide(filepath, text, category, index) {
    const colors = {
        person: '#2C3E50', history: '#3D2817', money: '#0D3D0D', food: '#4A1C1C',
        animal: '#0D3320', war: '#3D0D0D', crime: '#1a1a1a', science: '#0D1F3C',
        love: '#3D1C2C', death: '#1a1a1a', lego: '#FFE66D', default: '#1a1a2e'
    };
    const icons = {
        person: '👤 PERSON', history: '📜 HISTORY', money: '💰 MONEY', food: '🍽️ FOOD',
        animal: '🐾 ANIMAL', war: '⚔️ WAR', crime: '🔍 CRIME', science: '🔬 SCIENCE',
        love: '❤️ LOVE', death: '💀 DEATH', lego: '🧱 LEGO', default: '⭐ STORY'
    };

    const bg = colors[category] || colors.default;
    const icon = icons[category] || icons.default;

    // Simple solid color + text overlay
    const filter = `color=s=1080x1920:c=${bg}[bg];[bg]drawbox=x=0:y=0:w=1080:h=130:color=black@0.8:t=fill[header];[header]drawtext=text='${icon} TIME':fontcolor=white:fontsize=36:x=40:y=45[bg2];[bg2]drawtext=text='Part ${index + 1}':fontcolor=white:fontsize=28:x=40:y=90[bg3];[bg3]drawtext=text='${text.substring(0, 80)}':fontcolor=white:fontsize=32:x=60:y=250:max_lines=8[out]`;

    try {
        execSync(`ffmpeg -y -lavfi "${filter}" -frames:v 1 -q:v 2 "${filepath}"`, { stdio: 'pipe', timeout: 30 });
        console.log(`✓ Slide ${index + 1}: ${icon}`);
        return filepath;
    } catch (err) {
        // Fallback: just create a tiny PNG
        const minimal = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
        fs.writeFileSync(filepath, minimal);
        console.log(`✓ Minimal slide ${index + 1}`);
        return filepath;
    }
}

// Generate TTS
function generateTTS(text, filename) {
    const outputDir = CONFIG.OUTPUT_DIR;
    const filepath = path.join(outputDir, filename);
    const wavPath = filepath.replace('.mp3', '.wav');

    if (TOOLS.espeak) {
        try {
            execSync(`espeak-ng -p 60 -s 150 -w "${wavPath}" "${text.substring(0, 300)}"`, { stdio: 'pipe', timeout: 30 });
            if (fs.existsSync(wavPath)) {
                if (TOOLS.ffmpeg) {
                    execSync(`ffmpeg -y -i "${wavPath}" -b:a 128k "${filepath}"`, { stdio: 'pipe' });
                    try { fs.unlinkSync(wavPath); } catch {}
                }
                return filepath;
            }
        } catch (err) {}
    }
    return null;
}

// Run FFmpeg
function runFFmpeg(args) {
    return new Promise((resolve, reject) => {
        const child = spawn('ffmpeg', args);
        let stderr = '';
        child.stderr.on('data', d => stderr += d.toString());
        child.on('close', code => code === 0 ? resolve() : reject(new Error(stderr)));
    });
}

// Detect category
function detectCategory(text) {
    const lower = text.toLowerCase();
    const map = {
        person: ['man', 'woman', 'people', 'king', 'person'],
        history: ['year', 'century', 'war', 'ancient', 'history'],
        money: ['money', 'gold', 'rich', 'dollar'],
        food: ['food', 'eat', 'cook', 'recipe'],
        animal: ['animal', 'dog', 'cat', 'bird'],
        war: ['war', 'soldier', 'army', 'battle'],
        crime: ['crime', 'police', 'prison', 'murder'],
        science: ['science', 'invent', 'discovery'],
        love: ['love', 'marriage', 'romance'],
        death: ['death', 'die', 'kill', 'dead'],
        lego: ['lego', 'toy', 'brick']
    };
    for (const [cat, words] of Object.entries(map)) {
        if (words.some(w => lower.includes(w))) return cat;
    }
    return 'default';
}

// Render video
async function renderVideo(projectPath, uploadToGithub = true) {
    console.log(`\n🎬 Rendering: ${projectPath}`);

    const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
    const outputDir = CONFIG.OUTPUT_DIR;
    const outputFile = `story_video_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFile);
    const { width, height, duration } = project.settings;

    const slides = [];

    // Generate intro
    const introCat = detectCategory(project.title);
    const introSlide = path.join(outputDir, `slide_${Date.now()}_0.png`);
    createSlide(introSlide, project.title, introCat, 0);
    if (fs.existsSync(introSlide)) slides.push(introSlide);

    // Generate segment slides
    for (let i = 0; i < project.timeline.segments.length; i++) {
        const seg = project.timeline.segments[i];
        const cat = detectCategory(seg.narration);
        const slidePath = path.join(outputDir, `slide_${Date.now()}_${i + 1}.png`);
        createSlide(slidePath, seg.narration.substring(0, 100), cat, i + 1);
        if (fs.existsSync(slidePath)) slides.push(slidePath);
    }

    console.log(`\n📊 ${slides.length} slides created`);

    if (slides.length === 0) {
        throw new Error('No slides generated');
    }

    // Generate TTS
    const audioFiles = [];
    for (let i = 0; i < project.timeline.segments.length; i++) {
        const seg = project.timeline.segments[i];
        const audio = generateTTS(seg.narration, `audio_${Date.now()}_${i}.mp3`);
        if (audio && fs.existsSync(audio)) audioFiles.push(audio);
    }
    console.log(`🎵 ${audioFiles.length} audio files`);

    // Create video
    if (TOOLS.ffmpeg) {
        try {
            const concatFile = path.join(outputDir, 'concat.txt');
            const slideDur = Math.ceil(duration / slides.length);

            let concatContent = '';
            for (const slide of slides) {
                concatContent += `file '${slide}'\nduration ${slideDur}\n`;
            }
            fs.writeFileSync(concatFile, concatContent);

            const args = ['-y', '-f', 'concat', '-safe', '0', '-i', concatFile];

            // Subtitles
            const srtPath = path.join(outputDir, `subtitles-${project.id}.srt`);
            if (fs.existsSync(srtPath)) {
                fs.copyFileSync(srtPath, path.join(outputDir, 'subs.srt'));
                args.push('-i', path.join(outputDir, 'subs.srt'));
                args.push('-map', '1:0', '-c:s', 'mov_text');
            }

            // Audio
            if (audioFiles.length > 0 && fs.existsSync(audioFiles[0])) {
                args.push('-i', audioFiles[0]);
                args.push('-map', '0:v', '-map', '1:a');
            } else {
                args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p');
            }

            args.push('-vf', `scale=${width}:${height}`);
            args.push('-t', String(duration));
            args.push(outputPath);

            console.log('\n🎥 Running FFmpeg...');
            await runFFmpeg(args);
            console.log(`✅ Video created: ${outputPath}`);

            // Cleanup
            try { fs.unlinkSync(concatFile); } catch {}
            try { fs.unlinkSync(path.join(outputDir, 'subs.srt')); } catch {}

            if (fs.existsSync(outputPath)) {
                const size = fs.statSync(outputPath).size;
                console.log(`📦 Size: ${(size / 1024 / 1024).toFixed(2)} MB`);

                if (uploadToGithub && size > 5000) {
                    const githubUrl = await uploadToGitHub(outputPath, `Add video: ${project.title}`);
                    return { outputPath, githubUrl };
                }
            }
        } catch (err) {
            console.log(`Error: ${err.message.substring(0, 200)}`);
        }
    }

    return { outputPath, githubUrl: null };
}

module.exports = { renderVideo, CONFIG };
