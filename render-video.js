/**
 * Story Video Renderer - Simple PNG generation
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

        const payload = { message: commitMessage, content: fileContent };
        if (sha) payload.sha = sha;

        const response = await axios.put(
            `https://api.github.com/repos/${owner}/${repoName}/contents/${destPath}`,
            payload,
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

// Styles
const STYLES = {
    person: { bg: '#2C3E50', icon: '👤 PERSON' },
    history: { bg: '#3D2817', icon: '📜 HISTORY' },
    money: { bg: '#0D3D0D', icon: '💰 MONEY' },
    food: { bg: '#4A1C1C', icon: '🍽️ FOOD' },
    animal: { bg: '#0D3320', icon: '🐾 ANIMAL' },
    war: { bg: '#3D0D0D', icon: '⚔️ WAR' },
    crime: { bg: '#1a1a1a', icon: '🔍 CRIME' },
    science: { bg: '#0D1F3C', icon: '🔬 SCIENCE' },
    love: { bg: '#3D1C2C', icon: '❤️ LOVE' },
    death: { bg: '#1a1a1a', icon: '💀 DEATH' },
    lego: { bg: '#FFE66D', icon: '🧱 LEGO' },
    default: { bg: '#1a1a2e', icon: '⭐ STORY' }
};

// Detect category
function detectCategory(text) {
    const lower = text.toLowerCase();
    const map = {
        person: ['man', 'woman', 'people', 'king', 'person', 'human'],
        history: ['year', 'century', 'war', 'ancient', 'history'],
        money: ['money', 'gold', 'rich', 'dollar', 'million'],
        food: ['food', 'eat', 'cook', 'recipe', 'meal'],
        animal: ['animal', 'dog', 'cat', 'bird', 'fish'],
        war: ['war', 'soldier', 'army', 'battle', 'weapon'],
        crime: ['crime', 'police', 'prison', 'murder'],
        science: ['science', 'invent', 'discovery', 'theory'],
        love: ['love', 'marriage', 'romance', 'heart'],
        death: ['death', 'die', 'kill', 'dead'],
        lego: ['lego', 'toy', 'brick', 'play']
    };

    for (const [cat, words] of Object.entries(map)) {
        if (words.some(w => lower.includes(w))) return cat;
    }
    return 'default';
}

// Create simple colored PNG (raw Node.js, no dependencies)
function createSimplePNG(filepath, width, height, r, g, b) {
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, width, height);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filepath, buffer);
    return filepath;
}

// Create slide with text using FFmpeg drawtext
function createSlide(filepath, text, category, index) {
    const style = STYLES[category] || STYLES.default;

    // Parse hex color
    const hexToRgb = (hex) => {
        hex = hex.replace('#', '');
        return [parseInt(hex.substr(0, 2), 16), parseInt(hex.substr(2, 2), 16), parseInt(hex.substr(4, 2), 16)];
    };

    const [r, g, b] = hexToRgb(style.bg);
    const safeText = text.replace(/'/g, '').replace(/"/g, '').substring(0, 100);

    // Use FFmpeg to create colored background with text
    const filter = `color=c=0x${style.bg.replace('#','')}:s=1080x1920[bg];` +
        `[bg]drawbox=y=0:h=130:w=1080:c=black@0.8:t=fill[header];` +
        `[header]drawtext=text='${style.icon} TIME':fontcolor=white:fontsize=32:x=50:y=50:shadowcolor=black:shadowx=2:shadowy=2[out];` +
        `[out]drawtext=text='Part ${index + 1}':fontcolor=white:fontsize=24:x=50:y=90[final]`;

    try {
        execSync(`ffmpeg -y -lavfi "${filter}" -frames:v 1 "${filepath}"`, { stdio: 'pipe' });
        console.log(`✓ Slide ${index + 1}: ${style.icon}`);
        return filepath;
    } catch (err) {
        // Fallback: create minimal valid PNG
        const minimalPNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        fs.writeFileSync(filepath, minimalPNG);
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
            const safeText = text.replace(/"/g, '\\"').substring(0, 300);
            execSync(`espeak-ng -p 60 -s 150 -w "${wavPath}" "${safeText}"`, { stdio: 'pipe' });

            if (fs.existsSync(wavPath)) {
                if (TOOLS.ffmpeg) {
                    execSync(`ffmpeg -y -i "${wavPath}" -b:a 128k "${filepath}"`, { stdio: 'pipe' });
                    try { fs.unlinkSync(wavPath); } catch {}
                }
                return filepath;
            }
        } catch (err) {
            console.log(`TTS failed`);
        }
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

// Render video
async function renderVideo(projectPath, uploadToGithub = true) {
    console.log(`\n🎬 Rendering: ${projectPath}`);

    const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
    const outputDir = CONFIG.OUTPUT_DIR;
    const outputFile = `story_video_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFile);
    const { width, height, duration } = project.settings;

    const slides = [];

    // Generate intro slide
    const introCat = detectCategory(project.title);
    const introSlide = path.join(outputDir, `slide_${Date.now()}_0.png`);
    createSlide(introSlide, project.title, introCat, 0);
    if (fs.existsSync(introSlide)) slides.push(introSlide);

    // Generate segment slides
    for (let i = 0; i < project.timeline.segments.length; i++) {
        const seg = project.timeline.segments[i];
        const cat = detectCategory(seg.narration);
        const slidePath = path.join(outputDir, `slide_${Date.now()}_${i + 1}.png`);
        createSlide(slidePath, seg.narration.substring(0, 150), cat, i + 1);
        if (fs.existsSync(slidePath)) slides.push(slidePath);
    }

    if (slides.length === 0) {
        throw new Error('No slides generated');
    }

    console.log(`\n📊 ${slides.length} slides created`);

    // Generate TTS
    const audioFiles = [];
    for (let i = 0; i < project.timeline.segments.length; i++) {
        const seg = project.timeline.segments[i];
        const audio = generateTTS(seg.narration, `audio_${Date.now()}_${i}.mp3`);
        if (audio && fs.existsSync(audio)) audioFiles.push(audio);
    }

    console.log(`🎵 ${audioFiles.length} audio files created`);

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

            // Add subtitles
            const srtPath = path.join(outputDir, `subtitles-${project.id}.srt`);
            if (fs.existsSync(srtPath)) {
                fs.copyFileSync(srtPath, path.join(outputDir, 'subs.srt'));
                args.push('-i', path.join(outputDir, 'subs.srt'));
                args.push('-map', '1:0', '-c:s', 'mov_text');
            }

            // Add audio
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
            console.log(`FFmpeg error: ${err.message}`);
        }
    }

    return { outputPath, githubUrl: null };
}

module.exports = { renderVideo, CONFIG };
