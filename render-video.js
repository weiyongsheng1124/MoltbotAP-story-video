/**
 * Video Renderer - FREE Version with GitHub Auto-Upload
 * Uses FFmpeg + FREE tools (no API keys required!)
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

// GitHub upload helper - uses GitHub API
async function uploadToGitHub(filepath, commitMessage) {
    const axios = require('axios');
    const filename = path.basename(filepath);
    const destPath = path.join(CONFIG.VIDEO_DIR, filename);

    console.log(`\n📤 Uploading to GitHub: ${destPath}`);

    // Read file content
    const fileContent = fs.readFileSync(filepath, 'base64');
    const fileSize = Buffer.byteLength(fileContent, 'base64');

    console.log(`  File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    // Check for GitHub token
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
    const repo = CONFIG.GITHUB_REPO;
    const [owner, repoName] = repo.split('/');

    if (!githubToken) {
        console.log('  ⚠️ No GitHub token found. Skipping upload.');
        console.log('  Set GITHUB_TOKEN or GITHUB_PAT environment variable.');
        return null;
    }

    try {
        // Get current file SHA (if exists)
        let sha = null;
        try {
            const existingFile = await axios.get(
                `https://api.github.com/repos/${owner}/${repoName}/contents/${destPath}`,
                { headers: { Authorization: `token ${githubToken}` } }
            );
            sha = existingFile.data.sha;
            console.log('  Found existing file, will update...');
        } catch (e) {
            console.log('  New file, will create...');
        }

        // Upload file
        const content = fileContent;
        const payload = {
            message: commitMessage,
            content: content,
            branch: CONFIG.GITHUB_BRANCH
        };

        if (sha) {
            payload.sha = sha;
        }

        console.log(`  Uploading to: https://api.github.com/repos/${owner}/${repoName}/contents/${destPath}`);

        const response = await axios.put(
            `https://api.github.com/repos/${owner}/${repoName}/contents/${destPath}`,
            payload,
            {
                headers: {
                    Authorization: `token ${githubToken}`,
                    Accept: 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                }
            }
        );

        const downloadUrl = response.data.content.download_url;
        console.log(`  ✓ Uploaded successfully!`);
        console.log(`  URL: ${downloadUrl}`);

        return downloadUrl;

    } catch (err) {
        console.log(`  ⚠️ Upload failed: ${err.response?.data?.message || err.message}`);
        return null;
    }
}

// Check what tools are available
function checkAvailableTools() {
    const tools = {
        ffmpeg: false,
        imagemagick: false,
        python3: false,
        espeak: false
    };

    try {
        execSync('ffmpeg -version', { stdio: 'ignore' });
        tools.ffmpeg = true;
    } catch {}

    try {
        execSync('convert -version', { stdio: 'ignore' });
        tools.imagemagick = true;
    } catch {}

    try {
        execSync('python3 --version', { stdio: 'ignore' });
        tools.python3 = true;
    } catch {}

    try {
        execSync('espeak-ng --version', { stdio: 'ignore' });
        tools.espeak = true;
    } catch {}

    return tools;
}

// Check what tools are available (run once at module load)
const AVAILABLE_TOOLS = checkAvailableTools();

// Draw simple icons based on keywords
function drawIcon(draw, x, y, size, category) {
    const colors = {
        person: '#FF6B6B',
        history: '#4ECDC4',
        money: '#FFE66D',
        food: '#95E1D3',
        animal: '#DDA0DD',
        war: '#E74C3C',
        crime: '#2C3E50',
        science: '#3498DB',
        love: '#FF69B4',
        death: '#7F8C8D',
        default: '#FFFFFF'
    };

    const color = colors[category] || colors.default;
    draw.ellipse([x - size/2, y - size/2], [x + size/2, y + size/2], fill=color, width=3);

    // Add symbol based on category
    const symbols = {
        person: '👤',
        history: '📜',
        money: '💰',
        food: '🍽️',
        animal: '🐾',
        war: '⚔️',
        crime: '🔍',
        science: '🔬',
        love: '❤️',
        death: '💀'
    };

    return symbols[category] || '⭐';
}

// Generate image with story-relevant visual
function generateStoryImage(text, bgColor, duration, index, keywords = []) {
    const outputDir = CONFIG.OUTPUT_DIR;
    const filename = `slide_${Date.now()}_${index}.png`;
    const filepath = path.join(outputDir, filename);

    // Determine visual category from keywords
    const keywordMap = {
        person: ['man', 'woman', 'people', 'king', 'queen', 'president', 'artist', 'murderer', 'thief'],
        history: ['year', 'century', 'war', 'ancient', 'history', 'empire', 'battle'],
        money: ['money', 'gold', 'rich', 'poor', 'dollar', 'cost', 'worth', 'million'],
        food: ['food', 'eat', 'cook', 'recipe', 'meal', 'restaurant', 'delicious'],
        animal: ['animal', 'dog', 'cat', 'bird', 'fish', 'wild', 'species'],
        war: ['war', 'soldier', 'army', 'battle', 'fight', 'weapon', 'military'],
        crime: ['crime', 'police', 'prison', 'jail', 'steal', 'rob', 'murder', 'kill'],
        science: ['science', 'invent', 'discovery', 'experiment', 'theory', ' scientist'],
        love: ['love', 'marriage', 'romance', 'heart', 'wife', 'husband', 'romantic'],
        death: ['death', 'die', 'kill', 'dead', 'suicide', 'murder', 'execution']
    };

    let category = 'default';
    const lowerText = text.toLowerCase();

    for (const [cat, words] of Object.entries(keywordMap)) {
        if (words.some(w => lowerText.includes(w))) {
            category = cat;
            break;
        }
    }

    // Use Python PIL for reliable image generation
    if (AVAILABLE_TOOLS.python3) {
        try {
            const pythonCode = `
import PIL.Image
import PIL.ImageDraw
import PIL.ImageFont
import random

WIDTH, HEIGHT = 1080, 1920
filename = "${filepath}"
text = """${text.replace(/"/g, '\\"').replace(/\n/g, ' ').replace('\r', '').substring(0, 200)}"""
category = "${category}"
bg_color = "${bgColor}"

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

# Background colors based on category
bg_colors = {
    'person': '#2C3E50',
    'history': '#8B4513',
    'money': '#1a1a2e',
    'food': '#FF6B6B',
    'animal': '#228B22',
    'war': '#8B0000',
    'crime': '#1a1a1a',
    'science': '#00008B',
    'love': '#FF1493',
    'death': '#2F4F4F',
    'default': '#16213e'
}

main_bg = bg_colors.get(category, bg_colors['default'])

# Create gradient background
img = PIL.Image.new('RGB', (WIDTH, HEIGHT), hex_to_rgb(main_bg))
draw = PIL.ImageDraw.Draw(img)

# Add subtle pattern
for i in range(0, WIDTH, 40):
    draw.line([(i, 0), (i, HEIGHT)], fill=(255, 255, 255, 10), width=1)

# Add decorative elements based on category
if category == 'person':
    # Draw person silhouette
    draw.ellipse([WIDTH//2 - 150, 200, WIDTH//2 + 150, 500], fill=(255, 255, 255, 30))
    draw.ellipse([WIDTH//2 - 200, 350, WIDTH//2 + 200, 850], fill=(255, 255, 255, 20))
elif category == 'history':
    # Draw ancient paper look
    for _ in range(5):
        x = random.randint(100, WIDTH-100)
        y = random.randint(100, HEIGHT-100)
        r = random.randint(50, 150)
        draw.ellipse([x-r, y-r, x+r, y+r], outline=(255, 200, 150, 40), width=2)
elif category == 'money':
    # Draw coin circles
    for i in range(8):
        x = WIDTH//2 + (i - 3.5) * 100
        y = 300 + (i % 2) * 100
        draw.ellipse([x-40, y-40, x+40, y+40], fill=(255, 215, 0, 30), outline=(255, 215, 0, 60), width=3)
elif category == 'war':
    # Draw shield pattern
    for i in range(6):
        x = WIDTH//2 + (i - 2.5) * 150
        y = 250 + (i % 3) * 200
        draw.polygon([(x, y-60), (x+50, y+30), (x, y+80), (x-50, y+30)], outline=(200, 200, 200, 30), width=2)
elif category == 'default':
    # Simple geometric pattern
    for i in range(12):
        x = WIDTH//2 + (i - 5) * 100
        y = HEIGHT//2 + (i % 3) * 200 - 200
        r = 40 + i * 10
        draw.ellipse([x-r, y-r, x+r, y+r], outline=(255, 255, 255, 15), width=2)

# Add title bar
draw.rectangle([(0, 0), (WIDTH, 120)], fill=(0, 0, 0, 180))

# Add "STORY TIME" text
draw.text((60, 45), "STORY TIME", fill=(255, 100, 100), font_size=32)
draw.text((60, 75), "Part ${index + 1}", fill=(255, 255, 255), font_size=24)

# Draw text box
text_box_top = 400
text_box_height = HEIGHT - 600
draw.rectangle([(40, text_box_top), (WIDTH-40, text_box_top + text_box_height)], fill=(0, 0, 0, 150), outline=(255, 100, 100), width=3)

# Word wrap for text
words = text.split()
lines = []
current_line = []
for word in words:
    test_line = ' '.join(current_line + [word])
    # Simple word wrap approximation
    if len(test_line) < 50:
        current_line.append(word)
    else:
        lines.append(' '.join(current_line))
        current_line = [word]
if current_line:
    lines.append(' '.join(current_line))

# Draw each line
y_pos = text_box_top + 60
for i, line in enumerate(lines[:12]):  # Max 12 lines
    color = (255, 100, 100) if i == 0 else (255, 255, 255)
    draw.text((80, y_pos), line, fill=color, font_size=36 if i == 0 else 32)
    y_pos += 50

# Add category indicator
category_icons = {
    'person': '👤', 'history': '📜', 'money': '💰', 'food': '🍽️',
    'animal': '🐾', 'war': '⚔️', 'crime': '🔍', 'science': '🔬',
    'love': '❤️', 'death': '💀', 'default': '⭐'
}
icon = category_icons.get(category, category_icons['default'])
draw.text((WIDTH - 100, 45), icon, font_size=32)

# Add progress bar at bottom
progress = ${index} / 7
draw.rectangle([(0, HEIGHT - 20), (WIDTH * progress, HEIGHT)], fill=(255, 100, 100))

img.save(filename, quality=95)
print(f"Created: {filename} (category: {category})")
`;

            fs.writeFileSync('/tmp/gen_image.py', pythonCode);
            execSync('python3 /tmp/gen_image.py', { cwd: outputDir, stdio: 'pipe' });

            console.log(`Generated story image: ${filename} (${category})`);

            // Create info file
            fs.writeFileSync(filepath.replace('.png', '_info.txt'), JSON.stringify({
                text: text.substring(0, 100),
                category,
                duration, index,
                method: 'python-pil-story'
            }));

            return { filepath, duration, text, category };
        } catch (err) {
            console.log(`Python image error: ${err.message}`);
        }
    }

    // Final fallback
    try {
        const minimalPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        fs.writeFileSync(filepath, minimalPng);
        fs.writeFileSync(filepath.replace('.png', '_info.txt'), JSON.stringify({ text, category, duration, index, method: 'minimal' }));
        console.log(`Created minimal: ${filename}`);
        return { filepath, duration, text, category };
    } catch (err) {
        console.log(`Fallback error: ${err.message}`);
    }

    return { filepath, duration, text, category };
}

// Generate subscribe animation info (FREE - no rendering needed)
function generateSubscribeAnimation() {
    console.log('\nSubscribe Button Animation Sequence:');
    console.log('===================================');
    console.log('0-1s:  Button appears with scale-up bounce effect');
    console.log('1-3s:  Button floats gently');
    console.log('3-4s:  "SUBSCRIBE!" text appears');
    console.log('4-5s:  Golden bell icon wiggle animation');
    console.log('===================================\n');

    const outputDir = CONFIG.OUTPUT_DIR;
    const animInfo = {
        duration: 5,
        fps: 30,
        totalFrames: 150,
        elements: {
            button: {
                color: '#FF0000',
                text: 'SUBSCRIBE!',
                position: { x: 540, y: 1500 },
                size: { width: 400, height: 100 }
            },
            bell: {
                color: '#FFD700',
                position: { x: 540, y: 1300 },
                animation: 'wiggle'
            },
            cta: {
                text: 'for more amazing stories!',
                position: { x: 540, y: 1400 }
            },
            arrow: {
                emoji: '⬇️',
                position: { x: 540, y: 1650 }
            }
        }
    };

    const animPath = path.join(outputDir, 'subscribe_animation.json');
    fs.writeFileSync(animPath, JSON.stringify(animInfo, null, 2));
    console.log(`Animation info saved: ${animPath}`);

    return animInfo;
}

// Run FFmpeg command
function runFFmpeg(args) {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', args);

        let stderr = '';

        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(stderr));
            }
        });

        ffmpeg.on('error', reject);
    });
}

// Render complete video project
async function renderVideo(projectPath, uploadToGithub = true) {
    console.log(`\nRendering Video Project: ${projectPath}`);

    console.log('\nAvailable tools:');
    console.log(`  FFmpeg: ${AVAILABLE_TOOLS.ffmpeg ? '✓' : '✗'}`);
    console.log(`  ImageMagick: ${AVAILABLE_TOOLS.imagemagick ? '✓' : '✗'}`);
    console.log(`  Python3: ${AVAILABLE_TOOLS.python3 ? '✓' : '✗'}`);
    console.log(`  espeak: ${AVAILABLE_TOOLS.espeak ? '✓' : '✗'}`);

    // Load project
    const projectData = fs.readFileSync(projectPath, 'utf8');
    const project = JSON.parse(projectData);

    const { width, height, fps } = project.settings;
    const outputDir = CONFIG.OUTPUT_DIR;

    // Generate slides
    const slides = [];

    // Intro slide
    console.log('\nGenerating intro slide...');
    const introSlide = generateStoryImage(
        project.timeline.intro.content?.text || project.title,
        '#1a1a2e',
        project.timeline.intro.duration,
        0,
        [] // No keywords for intro
    );
    slides.push(introSlide);

    // Segment slides
    for (let i = 0; i < project.timeline.segments.length; i++) {
        const seg = project.timeline.segments[i];
        console.log(`\nGenerating segment ${i + 1} slide...`);
        const slide = generateStoryImage(
            seg.content?.text || seg.narration,
            '#2d2d4a',
            seg.duration,
            i + 1,
            seg.narration ? seg.narration.split(' ') : [] // Extract words as pseudo-keywords
        );
        slides.push(slide);
    }

    // Generate subscribe animation info
    console.log('\nGenerating subscribe button animation...');
    const subscribeAnim = generateSubscribeAnimation();

    // Create video
    console.log('\nCreating video from slides...');
    const outputFile = `story_video_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFile);

    let githubUrl = null;

    // Use FFmpeg if available
    if (AVAILABLE_TOOLS.ffmpeg && AVAILABLE_TOOLS.python3) {
        try {
            // Verify all slide images exist and are valid
            const validSlides = slides.filter(s => {
                try {
                    return fs.existsSync(s.filepath) && fs.statSync(s.filepath).size > 100;
                } catch { return false; }
            });

            if (validSlides.length === 0) {
                throw new Error('No valid slide images found');
            }

            console.log(`Using ${validSlides.length} valid slides`);

            // Create concat file for FFmpeg
            const concatFile = path.join(outputDir, 'concat.txt');

            // Each slide shows for equal time
            const slideDuration = Math.ceil(project.settings.duration / validSlides.length);

            let concatContent = '';
            for (const slide of validSlides) {
                concatContent += `file '${slide.filepath}'
duration ${slideDuration}
`;
            }

            fs.writeFileSync(concatFile, concatContent);
            console.log(`Created concat file with ${validSlides.length} slides, ${slideDuration}s each`);

            // Build FFmpeg command
            const args = [
                '-y',
                '-f', 'concat',
                '-safe', '0',
                '-i', concatFile
            ];

            // Add subtitles if SRT file exists
            const srtPath = path.join(outputDir, `subtitles-${project.id}.srt`);
            if (fs.existsSync(srtPath)) {
                console.log(`Adding subtitles from: ${srtPath}`);

                // Copy SRT to a simple path
                fs.copyFileSync(srtPath, path.join(outputDir, 'subtitles.srt'));
                args.push('-i', path.join(outputDir, 'subtitles.srt'));
                args.push('-map', '1:s');
                args.push('-c:s', 'mov_text');
            }

            // Video encoding options
            args.push(
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-crf', '23',
                '-pix_fmt', 'yuv420p',
                '-vf', `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2`,
                '-movflags', '+faststart'
            );

            // Output file
            args.push(outputPath);

            console.log('\nRunning FFmpeg...');
            console.log('FFmpeg args:', args.join(' '));
            console.log('Input file:', concatFile);

            // Read concat file for debug
            console.log('Concat file content:');
            console.log(fs.readFileSync(concatFile, 'utf8').substring(0, 500));

            await runFFmpeg(args);
            console.log(`\nVideo created: ${outputPath}`);

            // Clean up concat file
            try { fs.unlinkSync(concatFile); } catch {}
            try { fs.unlinkSync(path.join(outputDir, 'subtitles.srt')); } catch {}

            // Check file size
            if (fs.existsSync(outputPath)) {
                const fileSize = fs.statSync(outputPath).size;
                console.log(`\n📦 Video file size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

                if (fileSize > 10000) { // > 10KB
                    // Upload to GitHub via API
                    if (uploadToGithub) {
                        githubUrl = await uploadToGitHub(
                            outputPath,
                            `Add video: ${project.title}`
                        );
                    }
                } else {
                    console.log('\n⚠️ Video file too small, skipping upload');
                }
            }

        } catch (err) {
            console.log(`FFmpeg error: ${err.message}`);
            createPlaceholder(outputPath, project, slides, subscribeAnim, AVAILABLE_TOOLS);
        }
    } else {
        console.log('\nFFmpeg or Python not available - creating placeholder...');
        createPlaceholder(outputPath, project, slides, subscribeAnim, AVAILABLE_TOOLS);
    }

    return { outputPath, githubUrl };
}

// Create placeholder info when tools unavailable
function createPlaceholder(outputPath, project, slides, subscribeAnim, tools = {}) {
    const infoPath = outputPath.replace('.mp4', '_info.txt');
    const installCmd = {
        linux: 'sudo apt-get install ffmpeg imagemagick espeak-ng',
        macos: 'brew install ffmpeg imagemagick espeak-ng'
    };

    const infoContent = `Story Video Project
=============================================
Title: ${project.title}
Duration: ${project.settings.duration} seconds
Resolution: ${project.settings.width}x${project.settings.height}

Available Tools:
  FFmpeg: ${tools.ffmpeg ? '✓' : '✗'}
  ImageMagick: ${tools.imagemagick ? '✓' : '✗'}
  Python3: ${tools.python3 ? '✓' : '✗'}
  espeak-ng: ${tools.espeak ? '✓' : '✗'}

Slides Generated:
${slides.map((s, i) => `  ${i + 1}. ${s.filepath}`).join('\n')}

Subscribe Animation Info:
${JSON.stringify(subscribeAnim, null, 2)}

To render video, install missing tools:
  Linux: ${installCmd.linux}
  macOS: ${installCmd.macos}

Or use external rendering service.
`.trim();

    fs.writeFileSync(infoPath, infoContent);
    console.log(`Info file created: ${infoPath}`);
}

// Export functions
module.exports = {
    generateStoryImage,
    generateSubscribeAnimation,
    renderVideo,
    uploadToGitHub,
    checkAvailableTools,
    CONFIG
};

// Run if called directly
if (require.main === module) {
    const projectPath = process.argv[2] || path.join(CONFIG.OUTPUT_DIR, 'project-*.json').replace('*', '*');
    const uploadGithub = process.argv[3] !== '--no-upload';

    const files = fs.readdirSync(CONFIG.OUTPUT_DIR).filter(f => f.startsWith('project-'));
    if (files.length === 0) {
        console.log('No project files found. Run generator.js first.');
        process.exit(1);
    }

    const latestProject = files.sort().pop();
    const fullProjectPath = path.join(CONFIG.OUTPUT_DIR, latestProject);

    renderVideo(fullProjectPath, uploadGithub)
        .then(({ outputPath, githubUrl }) => {
            if (githubUrl) {
                console.log(`\n🎉 GitHub URL: ${githubUrl}`);
            }
            process.exit(0);
        })
        .catch(() => process.exit(1));
}
