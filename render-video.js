/**
 * Story Video Renderer - JavaScript version (no Python dependency)
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

// GitHub upload via API
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
        console.log(`Upload failed: ${err.message}`);
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

// Category styles
const STYLES = {
    person: { bg: '#2C3E50', icon: '👤', color: '#FF6B6B', name: 'PERSON' },
    history: { bg: '#3D2817', icon: '📜', color: '#D4A574', name: 'HISTORY' },
    money: { bg: '#0D3D0D', icon: '💰', color: '#FFE66D', name: 'MONEY' },
    food: { bg: '#4A1C1C', icon: '🍽️', color: '#FF8C69', name: 'FOOD' },
    animal: { bg: '#0D3320', icon: '🐾', color: '#98D8C8', name: 'ANIMAL' },
    war: { bg: '#3D0D0D', icon: '⚔️', color: '#E74C3C', name: 'WAR' },
    crime: { bg: '#1a1a1a', icon: '🔍', color: '#95A5A6', name: 'CRIME' },
    science: { bg: '#0D1F3C', icon: '🔬', color: '#74B9FF', name: 'SCIENCE' },
    love: { bg: '#3D1C2C', icon: '❤️', color: '#FF69B4', name: 'LOVE' },
    death: { bg: '#1a1a1a', icon: '💀', color: '#7F8C8D', name: 'DEATH' },
    lego: { bg: '#FFE66D', icon: '🧱', color: '#FF6B6B', name: ' LEGO ' },
    default: { bg: '#1a1a2e', icon: '⭐', color: '#FFFFFF', name: 'STORY' }
};

// Detect category
function detectCategory(text) {
    const lower = text.toLowerCase();
    const map = {
        person: ['man', 'woman', 'people', 'king', 'queen', 'person', 'human'],
        history: ['year', 'century', 'war', 'ancient', 'history', 'empire'],
        money: ['money', 'gold', 'rich', 'dollar', 'million', 'cash'],
        food: ['food', 'eat', 'cook', 'recipe', 'meal', 'delicious'],
        animal: ['animal', 'dog', 'cat', 'bird', 'fish', 'species'],
        war: ['war', 'soldier', 'army', 'battle', 'weapon', 'military'],
        crime: ['crime', 'police', 'prison', 'murder', 'criminal'],
        science: ['science', 'invent', 'discovery', 'experiment', 'theory'],
        love: ['love', 'marriage', 'romance', 'heart', 'wedding'],
        death: ['death', 'die', 'kill', 'dead', 'murder'],
        lego: ['lego', 'toy', 'brick', 'play', 'child']
    };

    for (const [cat, words] of Object.entries(map)) {
        if (words.some(w => lower.includes(w))) return cat;
    }
    return 'default';
}

// Simple PNG generator (no external deps)
function createPNG(filepath, text, category, index) {
    const style = STYLES[category] || STYLES.default;
    const W = 1080, H = 1920;

    // Parse hex color
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [0, 0, 0];
    };

    const [r, g, b] = hexToRgb(style.bg);

    // Create minimal valid PNG (1x1) and use FFmpeg to resize
    const tempPath = filepath.replace('.png', '_temp.png');
    const minimalPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(tempPath, minimalPng);

    // Escape text for FFmpeg
    const safeText = text.replace(/'/g, '').replace(/"/g, '').substring(0, 80);

    // Use FFmpeg to create styled image
    const filter = `color=c=${style.bg}:s=1080x1920,format=rgb24,fps=30[bg];` +
        `[bg]drawbox=x=0:y=0:w=1080:h=130:color=black@0.8:t=fill[header];` +
        `[header]drawtext=text='${style.icon} ${style.name} TIME':fontcolor=white:fontsize=36:x=50:y=50:shadowcolor=black:shadowx=2:shadowy=2[out]`;

    try {
        execSync(`ffmpeg -y -i "${tempPath}" -vf "${filter}" -frames:v 1 "${filepath}"`, { stdio: 'pipe' });
        fs.unlinkSync(tempPath);
        console.log(`✓ Created slide ${index + 1}: ${style.name}`);
        return filepath;
    } catch (err) {
        // Fallback - just copy minimal PNG
        fs.writeFileSync(filepath, minimalPng);
        fs.unlinkSync(tempPath);
        console.log(`✓ Created minimal slide ${index + 1}`);
        return filepath;
    }
}

// Generate TTS
function generateTTS(text, filename) {
    const outputDir = CONFIG.OUTPUT_DIR;
    const filepath = path.join(outputDir, filename);
    const wavPath = filepath.replace('.mp3', '.wav');

    console.log(`🎵 TTS: ${text.substring(0, 50)}...`);

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
            console.log(`TTS error: ${err.message}`);
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
    createPNG(introSlide, project.title, introCat, 0);
    if (fs.existsSync(introSlide)) slides.push(introSlide);

    // Generate segment slides
    for (let i = 0; i < project.timeline.segments.length; i++) {
        const seg = project.timeline.segments[i];
        const cat = detectCategory(seg.narration);
        const slidePath = path.join(outputDir, `slide_${Date.now()}_${i + 1}.png`);
        createPNG(slidePath, seg.narration.substring(0, 200), cat, i + 1);
        if (fs.existsSync(slidePath)) slides.push(slidePath);
    }

    if (slides.length === 0) {
        throw new Error('No slides generated');
    }

    console.log(`\n📊 Generated ${slides.length} slides`);

    // Generate TTS
    const audioFiles = [];
    for (let i = 0; i < project.timeline.segments.length; i++) {
        const seg = project.timeline.segments[i];
        const audio = generateTTS(seg.narration, `audio_${Date.now()}_${i}.mp3`);
        if (audio && fs.existsSync(audio)) audioFiles.push(audio);
    }

    console.log(`\n🎥 Created ${audioFiles.length} audio files`);

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
                console.log('📝 Adding subtitles...');
                fs.copyFileSync(srtPath, path.join(outputDir, 'subs.srt'));
                args.push('-i', path.join(outputDir, 'subs.srt'));
                args.push('-map', '1:0', '-c:s', 'mov_text');
            }

            // Add audio
            if (audioFiles.length > 0 && fs.existsSync(audioFiles[0])) {
                console.log('🎵 Adding audio...');
                args.push('-i', audioFiles[0]);
                args.push('-map', '0:v', '-map', '1:a');
            } else {
                args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p');
            }

            args.push('-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`);
            args.push('-t', String(duration));
            args.push(outputPath);

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
