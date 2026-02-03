/**
 * Story Video Renderer - Debug version
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
require('dotenv').config();

const CONFIG = {
    VIDEO: { width: 1080, height: 1920 },
    OUTPUT_DIR: path.join(__dirname, 'output'),
    GITHUB_REPO: 'weiyongsheng1124/MoltbotAP-story-video',
    VIDEO_DIR: 'video'
};

// GitHub upload
async function uploadToGitHub(filepath, commitMessage) {
    const axios = require('axios');
    const filename = path.basename(filepath);
    const destPath = path.join(CONFIG.VIDEO_DIR, filename);
    const fileContent = fs.readFileSync(filepath).toString('base64');
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;

    console.log(`\n📤 Uploading ${filename} to GitHub...`);

    if (!githubToken) {
        console.log('❌ No GITHUB_TOKEN');
        return null;
    }

    const [owner, repoName] = CONFIG.GITHUB_REPO.split('/');

    try {
        let sha = null;
        try {
            const existing = await axios.get(
                `https://api.github.com/repos/${owner}/${repoName}/contents/${destPath}`,
                { headers: { Authorization: `token ${githubToken}` } }
            );
            sha = existing.data.sha;
            console.log('  Existing file SHA:', sha);
        } catch (e) {
            console.log('  New file');
        }

        const response = await axios.put(
            `https://api.github.com/repos/${owner}/${repoName}/contents/${destPath}`,
            { message: commitMessage, content: fileContent, sha },
            { headers: { Authorization: `token ${githubToken}` } }
        );

        console.log('✅ Uploaded:', response.data.content.download_url);
        return response.data.content.download_url;
    } catch (err) {
        console.log('❌ Upload failed:', err.response?.data?.message || err.message);
        return null;
    }
}

// Check tools
function checkTools() {
    const tools = { ffmpeg: false, espeak: false };
    try { execSync('ffmpeg -version 2>&1 | head -1', { stdio: 'pipe' }); tools.ffmpeg = true; } catch (e) { console.log('FFmpeg not found'); }
    try { execSync('espeak-ng --version 2>&1 | head -1', { stdio: 'pipe' }); tools.espeak = true; } catch (e) { console.log('espeak-ng not found'); }
    return tools;
}

const TOOLS = checkTools();

// Simple slide creation
function createSlide(filepath, text, category, index) {
    const colors = {
        person: '#2C3E50', history: '#3D2817', money: '#0D3D0D', food: '#4A1C1C',
        animal: '#0D3320', war: '#3D0D0D', crime: '#1a1a1a', science: '#0D1F3C',
        love: '#3D1C2C', death: '#1a1a1a', lego: '#FFE66D', default: '#1a1a2e'
    };
    const icons = {
        person: '👤', history: '📜', money: '💰', food: '🍽️',
        animal: '🐾', war: '⚔️', crime: '🔍', science: '🔬',
        love: '❤️', death: '💀', lego: '🧱', default: '⭐'
    };

    const bg = colors[category] || colors.default;
    const icon = icons[category] || icons.default;

    console.log(`\n🎨 Creating slide ${index + 1}: ${icon} ${category || 'default'}`);

    // First create simple colored PNG using FFmpeg
    try {
        // Create colored background
        const cmd1 = `ffmpeg -y -f lavfi -i "color=c=${bg}:s=1080x1920" -frames:v 1 "${filepath}" 2>&1`;
        console.log('  Running:', cmd1.substring(0, 80));
        execSync(cmd1, { stdio: 'pipe', timeout: 30 });

        if (fs.existsSync(filepath)) {
            const size = fs.statSync(filepath).size;
            console.log(`  ✅ Created: ${size} bytes`);
            return filepath;
        }
    } catch (err) {
        console.log('  ❌ FFmpeg error:', err.message.substring(0, 100));
    }

    // Fallback: minimal PNG
    const minimal = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    fs.writeFileSync(filepath, minimal);
    console.log('  ⚠️ Minimal fallback');
    return filepath;
}

// Generate TTS
function generateTTS(text, filename) {
    const outputDir = CONFIG.OUTPUT_DIR;
    const filepath = path.join(outputDir, filename);
    const wavPath = filepath.replace('.mp3', '.wav');

    console.log(`\n🔊 TTS: ${text.substring(0, 50)}...`);

    if (TOOLS.espeak) {
        try {
            execSync(`espeak-ng -p 60 -s 150 -w "${wavPath}" "${text.substring(0, 300)}" 2>&1`, { stdio: 'pipe', timeout: 30 });

            if (fs.existsSync(wavPath)) {
                if (TOOLS.ffmpeg) {
                    execSync(`ffmpeg -y -i "${wavPath}" -b:a 128k "${filepath}" 2>&1`, { stdio: 'pipe' });
                    try { fs.unlinkSync(wavPath); } catch {}
                }
                console.log(`  ✅ Audio: ${fs.statSync(filepath).size} bytes`);
                return filepath;
            }
        } catch (err) {
            console.log('  ❌ TTS error:', err.message.substring(0, 100));
        }
    }
    return null;
}

// Run FFmpeg
function runFFmpeg(args) {
    return new Promise((resolve, reject) => {
        console.log('\n🎥 Running FFmpeg...');
        const child = spawn('ffmpeg', args);
        let stderr = '';
        child.stderr.on('data', d => stderr += d.toString());
        child.on('close', code => {
            if (code === 0) resolve();
            else {
                console.log('❌ FFmpeg failed:', stderr.substring(0, 300));
                reject(new Error(stderr));
            }
        });
    });
}

// Detect category
function detectCategory(text) {
    const lower = text.toLowerCase();
    const map = {
        person: ['man', 'woman', 'people', 'king'], history: ['year', 'century', 'war', 'ancient'],
        money: ['money', 'gold', 'rich', 'dollar'], food: ['food', 'eat', 'cook'],
        animal: ['animal', 'dog', 'cat', 'bird'], war: ['war', 'soldier', 'army', 'battle'],
        crime: ['crime', 'police', 'prison'], science: ['science', 'invent', 'discovery'],
        love: ['love', 'marriage', 'romance'], death: ['death', 'die', 'kill'],
        lego: ['lego', 'toy', 'brick']
    };
    for (const [cat, words] of Object.entries(map)) {
        if (words.some(w => lower.includes(w))) return cat;
    }
    return 'default';
}

// Render
async function renderVideo(projectPath, uploadToGithub = true) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🎬 RENDERING: ${projectPath}`);
    console.log('='.repeat(50));

    const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
    const outputDir = CONFIG.OUTPUT_DIR;
    const outputFile = `story_video_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFile);
    const { width, height, duration } = project.settings;

    // Slides
    const slides = [];
    const introCat = detectCategory(project.title);
    const introSlide = path.join(outputDir, `slide_${Date.now()}_0.png`);
    createSlide(introSlide, project.title, introCat, 0);
    if (fs.existsSync(introSlide)) slides.push(introSlide);

    for (let i = 0; i < project.timeline.segments.length; i++) {
        const seg = project.timeline.segments[i];
        const cat = detectCategory(seg.narration);
        const slidePath = path.join(outputDir, `slide_${Date.now()}_${i + 1}.png`);
        createSlide(slidePath, seg.narration.substring(0, 100), cat, i + 1);
        if (fs.existsSync(slidePath)) slides.push(slidePath);
    }

    console.log(`\n📊 Slides: ${slides.length}/${1 + project.timeline.segments.length}`);

    if (slides.length === 0) {
        throw new Error('No slides generated');
    }

    // Audio
    const audioFiles = [];
    for (let i = 0; i < project.timeline.segments.length; i++) {
        const seg = project.timeline.segments[i];
        const audio = generateTTS(seg.narration, `audio_${Date.now()}_${i}.mp3`);
        if (audio && fs.existsSync(audio)) audioFiles.push(audio);
    }

    console.log(`\n🎵 Audio files: ${audioFiles.length}`);

    // Create video
    if (TOOLS.ffmpeg && slides.length > 0) {
        try {
            const concatFile = path.join(outputDir, 'concat.txt');
            const slideDur = Math.ceil(duration / slides.length);

            let concatContent = '';
            for (const slide of slides) {
                concatContent += `file '${slide}'\nduration ${slideDur}\n`;
            }
            fs.writeFileSync(concatFile, concatContent);
            console.log(`\n📝 Concat file: ${concatContent.length} bytes`);

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

            await runFFmpeg(args);
            console.log(`\n✅ Video created: ${outputPath}`);

            // Cleanup
            try { fs.unlinkSync(concatFile); } catch {}
            try { fs.unlinkSync(path.join(outputDir, 'subs.srt')); } catch {}

            if (fs.existsSync(outputPath)) {
                const size = fs.statSync(outputPath).size;
                console.log(`\n📦 Size: ${size} bytes (${(size/1024/1024).toFixed(2)} MB)`);

                if (size > 1000) {
                    const githubUrl = await uploadToGitHub(outputPath, `Add video: ${project.title}`);
                    return { outputPath, githubUrl };
                } else {
                    console.log('⚠️ Video too small, skipping upload');
                }
            }
        } catch (err) {
            console.log(`\n❌ Render error: ${err.message.substring(0, 200)}`);
        }
    }

    return { outputPath, githubUrl: null };
}

module.exports = { renderVideo, CONFIG };
