/**
 * Story Video Renderer - FFmpeg only (no Python/Canvas)
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
    person: { bg: '#2C3E50', icon: '👤', name: 'PERSON', color: '0xFF6B6B' },
    history: { bg: '#3D2817', icon: '📜', name: 'HISTORY', color: '0xD4A574' },
    money: { bg: '#0D3D0D', icon: '💰', name: 'MONEY', color: '0xFFE66D' },
    food: { bg: '#4A1C1C', icon: '🍽️', name: 'FOOD', color: '0xFF8C69' },
    animal: { bg: '#0D3320', icon: '🐾', name: 'ANIMAL', color: '0x98D8C8' },
    war: { bg: '#3D0D0D', icon: '⚔️', name: 'WAR', color: '0xE74C3C' },
    crime: { bg: '#1a1a1a', icon: '🔍', name: 'CRIME', color: '0x95A5A6' },
    science: { bg: '#0D1F3C', icon: '🔬', name: 'SCIENCE', color: '0x74B9FF' },
    love: { bg: '#3D1C2C', icon: '❤️', name: 'LOVE', color: '0xFF69B4' },
    death: { bg: '#1a1a1a', icon: '💀', name: 'DEATH', color: '0x7F8C8D' },
    lego: { bg: '#FFE66D', icon: '🧱', name: ' LEGO ', color: '0xFF6B6B' },
    default: { bg: '#1a1a2e', icon: '⭐', name: 'STORY', color: '0xFFFFFF' }
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

// Create slide using FFmpeg
function createSlide(filepath, text, category, index) {
    const style = STYLES[category] || STYLES.default;
    const safeText = text.replace(/'/g, '').replace(/"/g, '').substring(0, 120);

    // FFmpeg drawtext filter for styled slide
    const filter = `color=c=${style.bg}:s=1080x1920:rate=30,format=rgba[b];` +
        `[b]drawbox=x=0:y=0:w=1080:h=130:color=black@0.7:t=fill[header];` +
        `[header]drawtext=text='${style.icon} ${style.name} TIME':fontcolor=white:fontsize=32:x=50:y=45:font=Arial:shadowcolor=black:shadowx=2:shadowy=2[bg1];` +
        `[bg1]drawtext=text='Part ${index + 1}':fontcolor=${style.color}:fontsize=24:x=50:y=85:font=Arial[bg2];` +
        `[bg2]drawbox=x=40:y=220:w=1000:h=900:color=black@0.5:t=fill:round=20[box];` +
        `[box]drawtext=text='${safeText}':fontcolor=white:fontsize=32:x=70:y=260:font=Arial:wrap=1:line_spacing=8[out]`;

    try {
        execSync(`ffmpeg -y -lavfi "${filter}" -frames:v 1 -q:v 2 "${filepath}"`, { stdio: 'pipe', timeout: 30 });
        console.log(`✓ Slide ${index + 1}: ${style.icon} ${style.name}`);
        return filepath;
    } catch (err) {
        console.log(`✗ Slide error: ${err.message.substring(0, 100)}`);
        return null;
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
            execSync(`espeak-ng -p 60 -s 150 -w "${wavPath}" "${safeText}"`, { stdio: 'pipe', timeout: 30 });

            if (fs.existsSync(wavPath)) {
                if (TOOLS.ffmpeg) {
                    execSync(`ffmpeg -y -i "${wavPath}" -b:a 128k "${filepath}"`, { stdio: 'pipe' });
                    try { fs.unlinkSync(wavPath); } catch {}
                }
                return filepath;
            }
        } catch (err) {
            console.log(`TTS: ${text.substring(0, 40)}...`);
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
        createSlide(slidePath, seg.narration.substring(0, 200), cat, i + 1);
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
            console.log(`FFmpeg error: ${err.message.substring(0, 200)}`);
        }
    }

    return { outputPath, githubUrl: null };
}

module.exports = { renderVideo, CONFIG };
