/**
 * Video Renderer - FREE Version
 * Uses FFmpeg + FREE tools (no API keys required!)
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const CONFIG = {
    VIDEO: {
        width: 1080,
        height: 1920,
        fps: 30,
        bgColor: '#1a1a2e'
    },
    OUTPUT_DIR: path.join(__dirname, 'output')
};

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

// Generate gradient background image (FREE - no API needed)
function generateGradientImage(text, bgColor, duration, index) {
    const outputDir = CONFIG.OUTPUT_DIR;
    const filename = `slide_${Date.now()}_${index}.png`;
    const filepath = path.join(outputDir, filename);

    // Create gradient background using ImageMagick if available
    try {
        const colors = [
            '#1a1a2e', '#16213e', '#0f3460', '#533483',
            '#e94560', '#ff6b6b', '#4ecdc4', '#45b7d1'
        ];
        const color1 = colors[index % colors.length];
        const color2 = colors[(index + 1) % colors.length];

        execSync(`convert -size 1080x1920 gradient:${color1}-${color2} -gravity center -pointsize 48 -fill white -annotate 0 "${text.substring(0, 100)}" ${filepath}`);
        console.log(`Generated image: ${filename}`);
    } catch (err) {
        // Fallback: create simple colored PNG with Python/PIL
        try {
            const pythonCode = `
import PIL.Image
import PIL.ImageDraw
import PIL.ImageFont

img = PIL.Image.new('RGB', (1080, 1920), '${bgColor}')
draw = PIL.ImageDraw.Draw(img)

# Add some decorative circles
for i in range(5):
    x = 540 + (i - 2) * 200
    y = 960 + (i % 2) * 300
    r = 100 + i * 50
    draw.ellipse([x-r, y-r, x+r, y+r], outline='white', width=3)

img.save('${filepath}')
`;
            fs.writeFileSync('/tmp/gen_image.py', pythonCode);
            execSync('python3 /tmp/gen_image.py', { cwd: outputDir });
            console.log(`Generated image: ${filename}`);
        } catch (err2) {
            // Final fallback: create placeholder info file
            fs.writeFileSync(filepath.replace('.png', '_info.txt'), JSON.stringify({ text, bgColor, duration, index }));
            console.log(`Created placeholder: ${filename}`);
        }
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
async function renderVideo(projectPath) {
    console.log(`\nRendering Video Project: ${projectPath}`);

    // Check available tools
    const tools = checkAvailableTools();
    console.log('\nAvailable tools:');
    console.log(`  FFmpeg: ${tools.ffmpeg ? '✓' : '✗'}`);
    console.log(`  ImageMagick: ${tools.imagemagick ? '✓' : '✗'}`);
    console.log(`  Python3: ${tools.python3 ? '✓' : '✗'}`);
    console.log(`  espeak-ng: ${tools.espeak ? '✓' : '✗'}`);

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

    if (tools.ffmpeg) {
        try {
            // Simple concat using FFmpeg
            const args = [
                '-y',
                '-loop', '1',
                '-i', slides[0].filepath,
                '-c:v', 'libx264',
                '-t', String(project.settings.duration),
                '-pix_fmt', 'yuv420p',
                '-vf', `scale=${width}:${height}`,
                outputPath
            ];

            console.log('\nRunning FFmpeg...');
            await runFFmpeg(args);
            console.log(`\nVideo created: ${outputPath}`);
        } catch (err) {
            console.log(`FFmpeg error: ${err.message}`);
            createPlaceholder(outputPath, project, slides, subscribeAnim, tools);
        }
    } else {
        console.log('\nFFmpeg not available - creating placeholder...');
        createPlaceholder(outputPath, project, slides, subscribeAnim, tools);
    }

    return outputPath;
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
    checkAvailableTools,
    CONFIG
};

// Run if called directly
if (require.main === module) {
    const projectPath = process.argv[2] || path.join(CONFIG.OUTPUT_DIR, 'project-*.json').replace('*', '*');

    const files = fs.readdirSync(CONFIG.OUTPUT_DIR).filter(f => f.startsWith('project-'));
    if (files.length === 0) {
        console.log('No project files found. Run generator.js first.');
        process.exit(1);
    }

    const latestProject = files.sort().pop();
    const fullProjectPath = path.join(CONFIG.OUTPUT_DIR, latestProject);

    renderVideo(fullProjectPath)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
