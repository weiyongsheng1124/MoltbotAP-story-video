/**
 * Story Video Generator - FREE Offline Version
 * No API keys required! Uses free local TTS and image generation.
 */

const axios = require('axios');
const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
require('dotenv').config();

// Configuration
const CONFIG = {
    // Story RSS Sources
    RSS_SOURCES: [
        {
            name: 'Today I Found Out',
            url: 'https://todayifoundout.com/feed/'
        },
        {
            name: 'Listverse',
            url: 'https://listverse.com/feed/'
        },
        {
            name: 'Weird History',
            url: 'https://weirdhistory.com/feed/'
        }
    ],

    // Video Settings
    VIDEO: {
        width: 1080,
        height: 1920,  // 9:16 for Reels/TikTok
        fps: 30,
        duration: 60,   // 1 minute
        bgColor: '#1a1a2e'
    },

    // TTS Settings (FREE - no API key needed)
    TTS: {
        voice: 'en',        // English
        speed: 150         // Words per minute
    },

    // Output Directory
    OUTPUT_DIR: './output'
};

// Initialize RSS Parser
const parser = new Parser();

// Create directories
function init() {
    if (!fs.existsSync(CONFIG.VIDEO.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.VIDEO.OUTPUT_DIR, { recursive: true });
    }
    console.log('Story Video Generator initialized (FREE - No API keys!)');
    console.log(`Output directory: ${CONFIG.VIDEO.OUTPUT_DIR}`);
}

// Fetch random story from RSS
async function fetchRandomStory() {
    console.log('\nFetching stories from RSS sources...');

    const stories = [];

    for (const source of CONFIG.RSS_SOURCES) {
        try {
            console.log(`Fetching from ${source.name}...`);
            const feed = await parser.parseURL(source.url);

            for (let i = 0; i < Math.min(20, feed.items.length); i++) {
                const item = feed.items[i];
                stories.push({
                    title: item.title,
                    link: item.link,
                    description: item.contentSnippet || item.content || '',
                    pubDate: item.pubDate,
                    source: source.name
                });
            }

            console.log(`Got ${feed.items.length} stories from ${source.name}`);
        } catch (err) {
            console.log(`Failed to fetch from ${source.name}: ${err.message}`);
        }
    }

    if (stories.length === 0) {
        throw new Error('No stories found from any source');
    }

    const randomIndex = Math.floor(Math.random() * stories.length);
    const selectedStory = stories[randomIndex];

    console.log(`\nSelected story: "${selectedStory.title}"`);
    console.log(`Source: ${selectedStory.source}`);

    return selectedStory;
}

// Clean and summarize story
function summarizeStory(story, maxWords = 180) {
    const content = story.description
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    let summary = content.substring(0, 800);

    const lastPeriod = summary.lastIndexOf('. ');
    if (lastPeriod > 200) {
        summary = summary.substring(0, lastPeriod + 1);
    }

    const segments = splitIntoSegments(summary, 6);

    return {
        title: story.title,
        source: story.source,
        link: story.link,
        fullText: summary,
        segments
    };
}

// Split text into segments
function splitIntoSegments(text, numSegments) {
    const words = text.split(' ');
    const wordsPerSegment = Math.ceil(words.length / numSegments);

    const segments = [];
    for (let i = 0; i < numSegments; i++) {
        const start = i * wordsPerSegment;
        const end = Math.min(start + wordsPerSegment, words.length);
        segments.push(words.slice(start, end).join(' '));
    }

    return segments;
}

// Generate narration script (English)
function generateScript(story) {
    const segments = story.segments;

    const intro = `Today, we're going to explore an incredible story: ${story.title}.`;

    const totalWords = segments.reduce((acc, s) => acc + s.split(' ').length, 0);
    const segmentDuration = Math.min(8, Math.max(6, 44 / segments.length));

    const script = {
        intro: intro,
        segments: segments.map((text, i) => ({
            text: text,
            duration: segmentDuration
        })),
        outro: `What did you think of this story? Leave a comment below! And don't forget to subscribe for more fascinating stories every day!`
    };

    return script;
}

// Generate SRT subtitles
function generateSRT(script) {
    let srt = '';
    let index = 1;
    let currentTime = 0;

    srt += `${index++}\n`;
    srt += `00:00:00,000 --> 00:00:03,000\n`;
    srt += `${script.intro}\n\n`;
    currentTime = 3;

    script.segments.forEach((seg) => {
        const duration = seg.duration;
        const startTime = formatSRTTime(currentTime);
        currentTime += duration;
        const endTime = formatSRTTime(currentTime);

        srt += `${index++}\n`;
        srt += `${startTime} --> ${endTime}\n`;
        srt += `${seg.text}\n\n`;
    });

    srt += `${index++}\n`;
    srt += `${formatSRTTime(currentTime)} --> 00:00:57,000\n`;
    srt += `${script.outro}\n`;

    return srt;
}

// Format time for SRT
function formatSRTTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

// Generate audio using espeak-ng (FREE - installed on most systems)
async function generateTTS(text, filename) {
    const filepath = path.join(CONFIG.VIDEO.OUTPUT_DIR, filename);

    return new Promise((resolve) => {
        // Try espeak-ng first (free, installed on Linux)
        const args = [
            '--pitch', '50',
            '--speed', '150',
            '-w', filepath + '.wav',
            text
        ];

        const espeak = spawn('espeak-ng', args);

        espeak.on('close', (code) => {
            if (code === 0 && fs.existsSync(filepath + '.wav')) {
                // Convert to MP3 using ffmpeg if available
                const ffmpeg = spawn('ffmpeg', ['-y', '-i', filepath + '.wav', filepath.replace('.mp3', '.mp3')]);

                ffmpeg.on('close', () => {
                    fs.unlinkSync(filepath + '.wav'); // Clean up
                    console.log(`Generated TTS: ${filename}`);
                    resolve(filepath.replace('.mp3', '.mp3'));
                });

                ffmpeg.on('error', () => {
                    // FFmpeg not available, use WAV
                    fs.renameSync(filepath + '.wav', filepath.replace('.mp3', '.wav'));
                    console.log(`Generated TTS (WAV): ${filename}`);
                    resolve(filepath.replace('.mp3', '.wav'));
                });
            } else {
                // Fallback: create silent placeholder
                console.log(`TTS generation failed for: ${text.substring(0, 30)}...`);
                resolve(null);
            }
        });

        espeak.on('error', () => {
            console.log('espeak-ng not available, using placeholder');
            resolve(null);
        });
    });
}

// Create video project structure
function createVideoProject(story, script, images) {
    const project = {
        id: uuidv4(),
        title: story.title,
        settings: CONFIG.VIDEO,
        timeline: {
            intro: {
                duration: 3,
                type: 'image',
                content: { color: '#1a1a2e', text: story.title }
            },
            segments: script.segments.map((seg, i) => ({
                duration: seg.duration,
                type: 'image',
                content: { color: '#2d2d4a', text: seg.text.substring(0, 50) },
                narration: seg.text
            })),
            outro: {
                duration: 5,
                type: 'subscribe',
                animation: 'pulse-bounce'
            }
        },
        audio: {
            narration: [],
            backgroundMusic: null
        },
        subtitles: generateSRT(script)
    };

    return project;
}

// Main function - Generate complete video project
async function generateVideo() {
    try {
        console.log('\n========================================');
        console.log('   STORY VIDEO GENERATOR (FREE)');
        console.log('   No API keys required!');
        console.log('========================================\n');

        init();

        // Step 1: Fetch story
        console.log('STEP 1: Fetching Story');
        const story = await fetchRandomStory();

        // Step 2: Summarize
        console.log('\nSTEP 2: Summarizing Story');
        const summarizedStory = summarizeStory(story);

        // Step 3: Generate script
        console.log('\nSTEP 3: Generating Script');
        const script = generateScript(summarizedStory);
        console.log(`Script: ${script.segments.length} segments`);

        // Step 4: Create project
        console.log('\nSTEP 4: Creating Video Project');
        const project = createVideoProject(summarizedStory, script, []);

        // Save project
        const projectPath = path.join(CONFIG.VIDEO.OUTPUT_DIR, `project-${project.id}.json`);
        fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
        console.log(`Project saved: ${projectPath}`);

        // Save subtitles
        const srtPath = path.join(CONFIG.VIDEO.OUTPUT_DIR, `subtitles-${project.id}.srt`);
        fs.writeFileSync(srtPath, project.subtitles);
        console.log(`Subtitles saved: ${srtPath}`);

        // Save story info
        const storyPath = path.join(CONFIG.VIDEO.OUTPUT_DIR, `story-${project.id}.txt`);
        const storyContent = `Title: ${story.title}
Source: ${story.source}
Link: ${story.link}
---
Script:
${script.intro}
${script.segments.map(s => `- ${s.text}`).join('\n')}
${script.outro}
`;
        fs.writeFileSync(storyPath, storyContent);
        console.log(`Story saved: ${storyPath}`);

        console.log('\n========================================');
        console.log('VIDEO PROJECT GENERATED!');
        console.log('========================================');
        console.log(`\nOutput Files:`);
        console.log(`- Project: ${projectPath}`);
        console.log(`- Subtitles: ${srtPath}`);
        console.log(`- Story: ${storyPath}`);
        console.log(`\nTo render video, run: node render-video.js`);
        console.log(`\nNote: TTS requires espeak-ng or say (macOS)`);

        return project;

    } catch (err) {
        console.error(`\nError: ${err.message}`);
        throw err;
    }
}

// Export for use as module
module.exports = {
    fetchRandomStory,
    summarizeStory,
    generateScript,
    generateSRT,
    generateVideo,
    CONFIG
};

// Run if called directly
if (require.main === module) {
    generateVideo()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
