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

// Generate gradient background image with Python (most reliable)
function generateGradientImage(text, bgColor, duration, index) {
    const outputDir = CONFIG.OUTPUT_DIR;
    const filename = `slide_${Date.now()}_${index}.png`;
    const filepath = path.join(outputDir, filename);

    const colors = [
        '#1a1a2e', '#16213e', '#0f3460', '#533483',
        '#e94560', '#ff6b6b', '#4ecdc4', '#45b7d1'
    ];
    const color1 = colors[index % colors.length];
    const color2 = colors[(index + 1) % colors.length];

    // Use Python PIL for reliable image generation
    if (AVAILABLE_TOOLS.python3) {
        try {
            // Create gradient using PIL
            const pythonCode = `
import PIL.Image
import PIL.ImageDraw
import PIL.ImageFont
import math

WIDTH, HEIGHT = 1080, 1920
filename = "${filepath}"
text = """${text.replace(/"/g, '\\"').replace(/\n/g, ' ').substring(0, 120)}"""
color1 = "${color1}"
color2 = "${color2}"

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

c1 = hex_to_rgb(color1)
c2 = hex_to_rgb(color2)

# Create gradient background
img = PIL.Image.new('RGB', (WIDTH, HEIGHT), c1)
draw = PIL.ImageDraw.Draw(img)

for y in range(HEIGHT):
    ratio = y / HEIGHT
    r = int(c1[0] + (c2[0] - c1[0]) * ratio)
    g = int(c1[1] + (c2[1] - c1[1]) * ratio)
    b = int(c1[2] + (c2[2] - c1[2]) * ratio)
    draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))

# Add decorative circles
for i in range(8):
    x = WIDTH // 2 + (i - 3.5) * 180
    y = HEIGHT // 2 + (i % 2) * 200 - 200
    r = 80 + i * 30
    alpha = 30 if i % 2 == 0 else 20
    draw.ellipse([x-r, y-r, x+r, y+r], outline=(255, 255, 255, alpha), width=2)

# Add text with shadow
shadow_offset = 3
draw.text((WIDTH//2 + shadow_offset, HEIGHT//2 + shadow_offset), text, fill=(0, 0, 0), anchor="mm", font_size=48)
draw.text((WIDTH//2, HEIGHT//2), text, fill=(255, 255, 255), anchor="mm", font_size=48)

# Add story indicator
indicator_text = f"Part {${index + 1}}"
draw.text((60, 60), indicator_text, fill=(255, 255, 255), font_size=32)

# Add progress bar
bar_height = 8
progress = ${index} / 7
draw.rectangle([(0, HEIGHT - bar_height), (WIDTH * progress, HEIGHT)], fill=(255, 100, 100))

img.save(filename, quality=95)
print(f"Created: {filename}")
`;

            fs.writeFileSync('/tmp/gen_image.py', pythonCode);
            execSync('python3 /tmp/gen_image.py', { cwd: outputDir, stdio: 'pipe' });

            console.log(`Generated image: ${filename}`);

            // Create info file
            fs.writeFileSync(filepath.replace('.png', '_info.txt'), JSON.stringify({
                text: text.substring(0, 100),
                color1, color2,
                duration, index,
                method: 'python-pil'
            }));

            return { filepath, duration, text };
        } catch (err) {
            console.log(`Python image error: ${err.message}`);
        }
    }

    // Final fallback: create minimal valid PNG
    try {
        // Create 1x1 pixel PNG and scale
        const minimalPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        fs.writeFileSync(filepath, minimalPng);

        fs.writeFileSync(filepath.replace('.png', '_info.txt'), JSON.stringify({ text, bgColor, duration, index, method: 'minimal' }));
        console.log(`Created minimal: ${filename}`);

        return { filepath, duration, text };
    } catch (err) {
        console.log(`Fallback error: ${err.message}`);
    }

    return { filepath, duration, text };
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
    const introSlide = generateGradientImage(
        project.timeline.intro.content?.text || project.title,
        '#1a1a2e',
        project.timeline.intro.duration,
        0
    );
    slides.push(introSlide);

    // Segment slides
    for (let i = 0; i < project.timeline.segments.length; i++) {
        const seg = project.timeline.segments[i];
        console.log(`\nGenerating segment ${i + 1} slide...`);
        const slide = generateGradientImage(
            seg.content?.text || seg.narration,
            '#2d2d4a',
            seg.duration,
            i + 1
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
    generateGradientImage,
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
