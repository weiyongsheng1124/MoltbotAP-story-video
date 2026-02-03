/**
 * Story Video Renderer - WITH subtitles, TTS, and story-specific visuals
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
require('dotenv').config();

const CONFIG = {
    VIDEO: {
        width: 1080,
        height: 1920,
        fps: 30,
        bgColor: '#1a1a2e'
    },
    OUTPUT_DIR: path.join(__dirname, 'output'),
    GITHUB_REPO: 'weiyongsheng1124/MoltbotAP-story-video',
    GITHUB_BRANCH: 'main',
    VIDEO_DIR: 'video'
};

// GitHub upload via API
async function uploadToGitHub(filepath, commitMessage) {
    const axios = require('axios');
    const filename = path.basename(filepath);
    const destPath = path.join(CONFIG.VIDEO_DIR, filename);
    const fileContent = fs.readFileSync(filepath, 'base64');
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;

    if (!githubToken) {
        console.log('  ⚠️ No GitHub token found');
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
        } catch {}

        const payload = { message: commitMessage, content: fileContent };
        if (sha) payload.sha = sha;

        const response = await axios.put(
            `https://api.github.com/repos/${owner}/${repoName}/contents/${destPath}`,
            payload,
            { headers: { Authorization: `token ${githubToken}` } }
        );

        console.log(`  ✓ Uploaded: ${response.data.content.download_url}`);
        return response.data.content.download_url;
    } catch (err) {
        console.log(`  ⚠️ Upload failed: ${err.message}`);
        return null;
    }
}

// Check available tools
function checkAvailableTools() {
    const tools = { ffmpeg: false, python3: false, espeak: false };

    try { execSync('ffmpeg -version', { stdio: 'ignore' }); tools.ffmpeg = true; } catch {}
    try { execSync('python3 --version', { stdio: 'ignore' }); tools.python3 = true; } catch {}
    try { execSync('espeak-ng --version', { stdio: 'ignore' }); tools.espeak = true; } catch {}

    return tools;
}

const AVAILABLE_TOOLS = checkAvailableTools();

// Detect story category from text
function detectCategory(text) {
    const lower = text.toLowerCase();
    const categories = {
        person: ['man', 'woman', 'people', 'king', 'queen', 'president', 'artist', 'murderer', 'thief', 'person', 'human'],
        history: ['year', 'century', 'war', 'ancient', 'history', 'empire', 'battle', 'historical'],
        money: ['money', 'gold', 'rich', 'poor', 'dollar', 'cost', 'worth', 'million', 'billion', 'cash'],
        food: ['food', 'eat', 'cook', 'recipe', 'meal', 'restaurant', 'delicious', 'tasty', 'ingredient'],
        animal: ['animal', 'dog', 'cat', 'bird', 'fish', 'wild', 'species', 'creature', 'zoo'],
        war: ['war', 'soldier', 'army', 'battle', 'fight', 'weapon', 'military', 'soldiers', 'troops'],
        crime: ['crime', 'police', 'prison', 'jail', 'steal', 'rob', 'murder', 'kill', 'criminal', 'police'],
        science: ['science', 'invent', 'discovery', 'experiment', 'theory', 'scientist', 'research'],
        love: ['love', 'marriage', 'romance', 'heart', 'wife', 'husband', 'romantic', 'wedding'],
        death: ['death', 'die', 'kill', 'dead', 'suicide', 'murder', 'execution', 'killed', 'died'],
        lego: ['lego', 'toy', 'brick', 'play', 'child', 'block']
    };

    for (const [cat, words] of Object.entries(categories)) {
        if (words.some(w => lower.includes(w))) return cat;
    }
    return 'default';
}

// Generate story slide with category-specific visuals
function generateStorySlide(text, duration, index, category) {
    const outputDir = CONFIG.OUTPUT_DIR;
    const filename = `slide_${Date.now()}_${index}.png`;
    const filepath = path.join(outputDir, filename);

    const styles = {
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

    const style = styles[category] || styles.default;
    const safeText = text.replace(/"/g, '\\"').replace(/\n/g, ' ').replace(/\r/g, '').substring(0, 300);

    const pythonCode = `
import PIL.Image
import PIL.ImageDraw
import PIL.ImageFont
import random
import textwrap

W, H = 1080, 1920
f = "${filepath}"
txt = """${safeText}"""
style = ${JSON.stringify(style)}
cat = "${category}"
idx = ${index}

def h2r(c):
    c = c.lstrip('#')
    return tuple(int(c[i:i+2], 16) for i in (0, 2, 4))

bg = h2r(style['bg'])
img = PIL.Image.new('RGB', (W, H), bg)
d = PIL.ImageDraw.Draw(img)

# Pattern
for i in range(0, W, 30):
    d.line([(i, 0), (i, H)], fill=(255,255,255,12), width=1)

# Category visuals
if cat == 'lego':
    for y in range(180, H-80, 35):
        for x in range(30, W-30, 55):
            if (x//55 + y//35) % 2 == 0:
                d.rectangle([x, y, x+45, y+25], fill=(255,80,80), outline=(200,40,40))
elif cat == 'person':
    cx = W//2
    d.ellipse([cx-130, 220, cx+130, 480], fill=(255,255,255,25))
    d.ellipse([cx-160, 380, cx+160, 780], fill=(255,255,255,18))
elif cat == 'money':
    for i in range(6):
        x = W//2 + (i-2)*90
        y = 260 + (i%2)*100
        d.ellipse([x-40, y-40, x+40, y+40], fill=(255,215,0,35), outline=(255,215,0,70), width=2)
elif cat == 'war':
    for i in range(5):
        x = W//2 + (i-2)*130
        y = 240 + (i%2)*160
        d.polygon([(x, y-45), (x+35, y+25), (x, y+65), (x-35, y+25)], outline=(140,140,140,35), width=3)
elif cat == 'history':
    for _ in range(8):
        x = random.randint(80, W-80)
        y = random.randint(200, H-200)
        r = random.randint(25, 70)
        d.ellipse([x-r, y-r, x+r, y+r], outline=(180,120,80,30), width=2)
else:
    for i in range(10):
        x = W//2 + (i-4)*90
        y = H//2 + (i%3)*160 - 180
        r = 25 + i*12
        d.ellipse([x-r, y-r, x+r, y+r], outline=(255,255,255,10), width=2)

# Top banner
d.rectangle([(0, 0), (W, 130)], fill=(0,0,0,180))
d.text((45, 45), style['icon'], font_size=34)
d.text((100, 45), style['name'] + ' TIME', fill=style['color'], font_size=30)
d.text((100, 82), f"Part {idx+1}", fill=(255,255,255), font_size=22)

# Text box
box_y = 250
box_h = H - 480
d.rectangle([(30, box_y), (W-30, box_y+box_h)], fill=(0,0,0,130), outline=style['color'], width=3)

# Wrap text
wrap = textwrap.TextWrapper(width=32, break_long_words=False)
lines = wrap.wrap(txt)[:11]

y = box_y + 40
for i, line in enumerate(lines):
    fc = style['color'] if i == 0 else (255,255,255)
    fs = 36 if i == 0 else 30
    d.text((55, y), line, fill=fc, font_size=fs)
    y += 42

# Progress bar
d.rectangle([(0, H-12), (W, H)], fill=(40,40,40))
d.rectangle([(0, H-12), (W * (idx+1) / 8, H)], fill=style['color'])

img.save(f, quality=92)
print(f"Created: {f}")
`;

    if (AVAILABLE_TOOLS.python3) {
        try {
            fs.writeFileSync('/tmp/gen_slide.py', pythonCode);
            execSync('python3 /tmp/gen_slide.py', { cwd: outputDir, stdio: 'pipe' });
            console.log(`✓ Generated slide ${idx+1}: ${category}`);
            return filepath;
        } catch (err) {
            console.log(`✗ Python error: ${err.message}`);
        }
    }
    return null;
}

// Generate TTS audio
function generateTTS(text, filename) {
    const outputDir = CONFIG.OUTPUT_DIR;
    const filepath = path.join(outputDir, filename);
    const wavPath = filepath.replace('.mp3', '.wav');

    console.log(`🎵 Generating TTS: ${filename}`);

    if (AVAILABLE_TOOLS.espeak) {
        try {
            execSync(`espeak-ng -p 60 -s 150 -w "${wavPath}" "${text.replace(/"/g, '\\"').substring(0, 500)}"`, { stdio: 'pipe' });

            if (fs.existsSync(wavPath)) {
                if (AVAILABLE_TOOLS.ffmpeg) {
                    execSync(`ffmpeg -y -i "${wavPath}" -b:a 128k "${filepath}"`, { stdio: 'pipe' });
                    try { fs.unlinkSync(wavPath); } catch {}
                } else {
                    return wavPath;
                }
                return filepath;
            }
        } catch (err) {
            console.log(`espeak error: ${err.message}`);
        }
    }

    console.log(`⚠️ TTS failed for: ${text.substring(0, 50)}...`);
    return null;
}

// Run FFmpeg command
function runFFmpeg(args) {
    return new Promise((resolve, reject) => {
        const child = spawn('ffmpeg', args);
        let stderr = '';
        child.stderr.on('data', d => stderr += d.toString());
        child.on('close', code => code === 0 ? resolve() : reject(new Error(stderr)));
        child.on('error', reject);
    });
}

// Render complete video
async function renderVideo(projectPath, uploadToGithub = true) {
    console.log(`\n🎬 Rendering: ${projectPath}`);

    const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
    const outputDir = CONFIG.OUTPUT_DIR;
    const outputFile = `story_video_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFile);
    const { width, height, duration } = project.settings;

    // Generate slides
    const slides = [];
    console.log('\n📊 Generating story slides...');

    // Intro
    const introCat = detectCategory(project.title);
    const introSlide = generateStorySlide(project.title, 5, 0, introCat);
    if (introSlide) slides.push(introSlide);

    // Segments
    for (let i = 0; i < project.timeline.segments.length; i++) {
        const seg = project.timeline.segments[i];
        const cat = detectCategory(seg.narration);
        const slide = generateStorySlide(seg.narration, 8, i + 1, cat);
        if (slide) slides.push(slide);
    }

    if (slides.length === 0) {
        throw new Error('No slides generated');
    }

    // Generate TTS
    const audioFiles = [];
    console.log('\n🔊 Generating audio...');

    for (let i = 0; i < project.timeline.segments.length; i++) {
        const seg = project.timeline.segments[i];
        const audio = generateTTS(seg.narration, `audio_${Date.now()}_${i}.mp3`);
        if (audio) audioFiles.push(audio);
    }

    // Create video with FFmpeg
    console.log('\n🎥 Creating video...');

    if (AVAILABLE_TOOLS.ffmpeg && slides.length > 0) {
        try {
            // Create concat file
            const concatFile = path.join(outputDir, 'concat.txt');
            const slideDur = Math.ceil(duration / slides.length);

            let concatContent = '';
            for (const slide of slides) {
                concatContent += `file '${slide}'
duration ${slideDur}
`;
            }
            fs.writeFileSync(concatFile, concatContent);

            // Build FFmpeg command
            const args = ['-y', '-f', 'concat', '-safe', '0', '-i', concatFile];

            // Add subtitles if available
            const srtPath = path.join(outputDir, `subtitles-${project.id}.srt`);
            if (fs.existsSync(srtPath)) {
                console.log('📝 Adding subtitles...');
                fs.copyFileSync(srtPath, path.join(outputDir, 'subs.srt'));
                args.push('-i', path.join(outputDir, 'subs.srt'));
                args.push('-map', '1:0', '-c:s', 'mov_text');
            }

            // Add audio if available
            if (audioFiles.length > 0 && fs.existsSync(audioFiles[0])) {
                console.log('🎵 Adding audio...');
                args.push('-i', audioFiles[0]);
                args.push('-map', '0:v', '-map', '1:a', '-c:v', 'copy');
            } else {
                args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p');
            }

            args.push('-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`);
            args.push('-movflags', '+faststart');
            args.push('-t', String(duration));
            args.push(outputPath);

            console.log('Running FFmpeg...');
            await runFFmpeg(args);

            // Cleanup
            try { fs.unlinkSync(concatFile); } catch {}
            try { fs.unlinkSync(path.join(outputDir, 'subs.srt')); } catch {}

            console.log(`✅ Video created: ${outputPath}`);

            // Check size
            if (fs.existsSync(outputPath)) {
                const size = fs.statSync(outputPath).size;
                console.log(`📦 Size: ${(size/1024/1024).toFixed(2)} MB`);

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
