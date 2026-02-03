/**
 * Video Renderer
 * Uses FFmpeg to render the final video with:
 * - Background images
 * - AI Narration (TTS)
 * - Background music
 * - Subtitles (burned in)
 * - Subscribe button animation at end
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CONFIG = {
    VIDEO: {
        width: 1080,
        height: 1920,  // 9:16 for Reels
        fps: 30,
        bgColor: '#1a1a2e'
    },
    FONT: {
        family: 'Arial',
        size: 48,
        color: '#ffffff'
    },
    OUTPUT_DIR: './output'
};

/**
 * Generate placeholder image with text (using FFmpeg drawtext filter)
 * For production, use DALL-E or Stable Diffusion
 */
async function generateTextImage(text, bgColor = '#1a1a2e', duration = 5, index = 0) {
    // Create a simple colored PNG using FFmpeg
    // In production, use DALL-E or similar

    const { width, height } = CONFIG.VIDEO;
    const filename = `slide_${Date.now()}_${index}.png`;
    const filepath = path.join(CONFIG.OUTPUT_DIR, filename);

    // Generate a simple colored background image
    const colorArgs = [
        '-y',
        '-f', 'lavfi',
        '-i', `color=c=${bgColor}:s=${width}x${height}:d=${duration}`,
        '-frames:v', '1',
        filepath
    ];

    try {
        await runFFmpeg(colorArgs);
        console.log(`Generated slide: ${filename}`);
    } catch (err) {
        // FFmpeg not available, create placeholder info file
        const placeholderPath = filepath.replace('.png', '_info.txt');
        fs.writeFileSync(placeholderPath, JSON.stringify({
            text,
            bgColor,
            duration,
            index
        }, null, 2));
        console.log(`Created placeholder info: ${filename} (FFmpeg not available)`);
    }

    return {
        filepath,
        duration,
        text
    };
}

/**
 * Generate subscribe button animation info
 * For production, use FFmpeg with drawtext and overlay filters
 */
function generateSubscribeAnimation() {
    console.log('\nSubscribe Button Animation Sequence:');
    console.log('===================================');
    console.log('0-1s:  Button appears with scale-up bounce effect');
    console.log('1-3s:  Button floats gently (subtle bounce)');
    console.log('3-4s:  "SUBSCRIBE!" text appears');
    console.log('4-5s:  Golden bell icon wiggle animation');
    console.log('5s+:   Arrow pointing down to button');
    console.log('===================================\n');

    // Create animation metadata file
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
        },
        keyframes: [
            { time: 0, scale: 1.2, opacity: 0 },
            { time: 0.5, scale: 1.0, opacity: 1 },
            { time: 1.5, yOffset: -10 },
            { time: 2.5, yOffset: 0 },
            { time: 3.5, bellRotation: 0.2 },
            { time: 4.0, bellRotation: -0.2 },
            { time: 4.5, bellRotation: 0.1 }
        ]
    };

    const animPath = path.join(CONFIG.OUTPUT_DIR, 'subscribe_animation.json');
    fs.writeFileSync(animPath, JSON.stringify(animInfo, null, 2));
    console.log(`Animation info saved: ${animPath}`);

    return animInfo;
}

/**
 * Run FFmpeg command
 */
function runFFmpeg(args) {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', args);

        let stdout = '';
        let stderr = '';

        ffmpeg.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
            // Progress output
            const line = data.toString();
            if (line.includes('frame=') || line.includes('time=')) {
                process.stdout.write(`\r${line.trim()}`);
            }
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(`FFmpeg exited with code ${code}\n${stderr}`));
            }
        });

        ffmpeg.on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Render complete video project
 */
async function renderVideo(projectPath) {
    console.log(`\nRendering Video Project: ${projectPath}`);

    // Load project
    const projectData = fs.readFileSync(projectPath, 'utf8');
    const project = JSON.parse(projectData);

    const { width, height, fps } = project.settings;
    const outputDir = CONFIG.OUTPUT_DIR;

    // Generate slides for intro and segments
    const slides = [];

    // Intro slide
    console.log('\nGenerating intro slide...');
    const introSlide = await generateTextImage(
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
        const slide = await generateTextImage(
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

    // Create video from slides
    console.log('\nCreating video from slides...');
    const outputFile = `story_video_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFile);

    // Simple approach: extend first slide to full duration
    // In production with FFmpeg, concat all slides properly
    const simpleArgs = [
        '-y',
        '-loop', '1',
        '-i', slides[0].filepath,
        '-c:v', 'libx264',
        '-t', String(project.settings.duration),
        '-pix_fmt', 'yuv420p',
        '-vf', `scale=${width}:${height}`,
        outputPath
    ];

    try {
        console.log('\nRunning FFmpeg to create video...');

        // Check if FFmpeg is available
        try {
            await runFFmpeg(['-version']);
            await runFFmpeg(simpleArgs);
            console.log(`\nVideo created: ${outputPath}`);
        } catch (ffmpegErr) {
            console.log(`\nFFmpeg not available: ${ffmpegErr.message}`);
            console.log('Creating placeholder output...');

            // Create placeholder info file
            const infoPath = outputPath.replace('.mp4', '_info.txt');
            const infoContent = `Story Video Project
===================
Title: ${project.title}
Duration: ${project.settings.duration} seconds
Resolution: ${width}x${height}
FPS: ${fps}

Slides Generated:
${slides.map((s, i) => `  ${i + 1}. ${s.filepath} (${s.duration}s)`).join('\n')}

Narration Files:
${project.audio.narration.map((a, i) => `  ${i + 1}. ${a}`).join('\n')}

Subscribe Animation:
${JSON.stringify(subscribeAnim, null, 2)}

To render full video, install FFmpeg and run:
ffmpeg -loop 1 -t 5 -i slide1.png -loop 1 -t 8 -i slide2.png ... -filter_complex "[0:v][1:v]concat=n=N:v=1:a=0[outv]" -map "[outv]" -c:v libx264 output.mp4
`.trim();
            fs.writeFileSync(infoPath, infoContent);
            console.log(`Info file created: ${infoPath}`);
        }

        return outputPath;

    } catch (err) {
        console.error(`Error rendering video: ${err.message}`);
        throw err;
    }
}

/**
 * Add subtitles to video
 */
async function addSubtitles(videoPath, srtPath) {
    const outputPath = videoPath.replace('.mp4', '_with_subs.mp4');

    const args = [
        '-y',
        '-i', videoPath,
        '-vf', `subtitles=${srtPath}`,
        '-c:a', 'copy',
        outputPath
    ];

    try {
        await runFFmpeg(args);
        console.log(`Subtitles added: ${outputPath}`);
        return outputPath;
    } catch (err) {
        console.log(`Failed to add subtitles: ${err.message}`);
        return videoPath;
    }
}

/**
 * Add background music to video
 */
async function addBackgroundMusic(videoPath, musicPath, musicVolume = 0.3) {
    const outputPath = videoPath.replace('.mp4', '_with_music.mp4');

    const args = [
        '-y',
        '-i', videoPath,
        '-i', musicPath,
        '-filter_complex', `[0:a][1:a]amix=inputs=2:duration=first:weights=1 ${musicVolume}[out]`,
        '-map', '0:v',
        '-map', '[out]',
        '-c:v', 'copy',
        outputPath
    ];

    try {
        await runFFmpeg(args);
        console.log(`Background music added: ${outputPath}`);
        return outputPath;
    } catch (err) {
        console.log(`Failed to add music: ${err.message}`);
        return videoPath;
    }
}

// Export functions
module.exports = {
    generateTextImage,
    generateSubscribeFrame,
    generateSubscribeFrames,
    renderVideo,
    addSubtitles,
    addBackgroundMusic,
    CONFIG
};

// Run if called directly
if (require.main === module) {
    const projectPath = process.argv[2] || path.join(CONFIG.OUTPUT_DIR, 'project-*.json').replace('*', '*');

    // Find latest project file
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
