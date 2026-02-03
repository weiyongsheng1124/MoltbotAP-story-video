/**
 * Story Video Generator
 * Generates 1-minute animated story videos with AI narration, subtitles, and subscribe button
 */

const axios = require('axios');
const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
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
        duration: 60,  // 1 minute
        bgColor: '#1a1a2e'
    },

    // OpenAI TTS Settings
    TTS: {
        voice: 'alloy',  // alloy, echo, fable, onyx, nova, shimmer
        model: 'tts-1',
        speed: 1.0
    },

    // Output Directory
    OUTPUT_DIR: './output'
};

// Initialize OpenAI client (if API key available)
let openaiClient = null;
if (process.env.OPENAI_API_KEY) {
    const OpenAI = require('openai');
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Initialize RSS Parser
const parser = new Parser();

// Create directories
function init() {
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }
    console.log('Story Video Generator initialized');
    console.log(`Output directory: ${CONFIG.OUTPUT_DIR}`);
}

// Fetch random story from RSS
async function fetchRandomStory() {
    console.log('\nFetching stories from RSS sources...');

    const stories = [];

    for (const source of CONFIG.RSS_SOURCES) {
        try {
            console.log(`Fetching from ${source.name}...`);
            const feed = await parser.parseURL(source.url);

            // Get recent stories (last 20)
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

    // Return random story
    const randomIndex = Math.floor(Math.random() * stories.length);
    const selectedStory = stories[randomIndex];

    console.log(`\nSelected story: "${selectedStory.title}"`);
    console.log(`Source: ${selectedStory.source}`);

    return selectedStory;
}

// Clean and summarize story for video
function summarizeStory(story, maxWords = 180) {
    // Extract key points from description
    const content = story.description
        .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
        .replace(/\s+/g, ' ')       // Normalize whitespace
        .trim();

    // Take first 800 chars as hook, then more content
    let summary = content.substring(0, 800);

    // Find a good breaking point (sentence end)
    const lastPeriod = summary.lastIndexOf('. ');
    if (lastPeriod > 200) {
        summary = summary.substring(0, lastPeriod + 1);
    }

    // Split into segments for video (aim for ~60 seconds total)
    const segments = splitIntoSegments(summary, 6);

    return {
        title: story.title,
        source: story.source,
        link: story.link,
        fullText: summary,
        segments
    };
}

// Split text into equal segments
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

    // Intro: 3 seconds
    const intro = `Today, we're going to explore an incredible story: ${story.title}.`;

    // Calculate segment duration based on word count (approx 150 words per minute)
    const totalWords = segments.reduce((acc, s) => acc + s.split(' ').length, 0);
    const estimatedMinutes = totalWords / 150;
    const availableSeconds = 50 - 3 - 6; // Total 60s minus intro (3s) and outro (6s)
    const segmentDuration = Math.min(8, Math.max(6, availableSeconds / segments.length));

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

// Generate subtitle file (SRT format)
function generateSRT(script) {
    let srt = '';
    let index = 1;
    let currentTime = 0;

    // Intro
    srt += `${index++}\n`;
    srt += `00:00:00,000 --> 00:00:03,000\n`;
    srt += `${script.intro}\n\n`;
    currentTime = 3;

    // Segments
    script.segments.forEach((seg, i) => {
        const duration = seg.duration;
        const startTime = formatSRTTime(currentTime);
        currentTime += duration;
        const endTime = formatSRTTime(currentTime);

        srt += `${index++}\n`;
        srt += `${startTime} --> ${endTime}\n`;
        srt += `${seg.text}\n\n`;
    });

    // Outro
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

// Generate image prompt for DALL-E
function generateImagePrompt(text) {
    return `Create a visually stunning, cinematic background image for a story video about: "${text.substring(0, 150)}...". Use dark blue and purple tones, dramatic lighting, mysterious atmosphere. No text, no people, abstract and atmospheric. 1024x1024 resolution.`;
}

// Generate image using DALL-E (if API key available)
async function generateImage(prompt) {
    if (!openaiClient) {
        console.log('No OpenAI API key - skipping image generation');
        return null;
    }

    try {
        console.log('Generating image with DALL-E...');
        const response = await openaiClient.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            size: "1024x1024",
            quality: "standard",
            n: 1
        });

        // Download image
        const imageUrl = response.data[0].url;
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const filename = `image_${Date.now()}.png`;
        const filepath = path.join(CONFIG.OUTPUT_DIR, filename);
        fs.writeFileSync(filepath, imageResponse.data);

        console.log(`Image saved: ${filepath}`);
        return filepath;
    } catch (err) {
        console.log(`Failed to generate image: ${err.message}`);
        return null;
    }
}

// Generate TTS audio using OpenAI (if API key available)
async function generateTTS(text, voice = 'alloy') {
    if (!openaiClient) {
        console.log('No OpenAI API key - skipping TTS generation');
        return null;
    }

    try {
        console.log('Generating TTS narration...');
        const response = await openaiClient.audio.speech.create({
            model: "tts-1",
            voice: voice,
            input: text,
            speed: 1.0
        });

        const buffer = Buffer.from(await response.arrayBuffer());
        const filename = `narration_${Date.now()}.mp3`;
        const filepath = path.join(CONFIG.OUTPUT_DIR, filename);
        fs.writeFileSync(filepath, buffer);

        console.log(`Audio saved: ${filepath}`);
        return filepath;
    } catch (err) {
        console.log(`Failed to generate TTS: ${err.message}`);
        return null;
    }
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
                content: images[0] || { color: '#1a1a2e', text: story.title }
            },
            segments: script.segments.map((seg, i) => ({
                duration: seg.duration,
                type: 'image',
                content: images[i + 1] || { color: '#2d2d4a', text: seg.text.substring(0, 50) },
                narration: seg.text
            })),
            outro: {
                duration: 5,
                type: 'subscribe',
                animation: 'pulse-bounce'
            }
        },
        audio: {
            narration: null,
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
        console.log('   STORY VIDEO GENERATOR');
        console.log('   Generate 1-minute animated stories');
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

        // Step 4: Generate images
        console.log('\nSTEP 4: Generating Images');
        const images = [];
        const totalImages = 1 + script.segments.length;

        // Intro image
        const introPrompt = generateImagePrompt(summarizedStory.title);
        const introImage = await generateImage(introPrompt);
        images.push(introImage);

        // Segment images
        for (let i = 0; i < script.segments.length; i++) {
            const segPrompt = generateImagePrompt(script.segments[i].text);
            const segImage = await generateImage(segPrompt);
            images.push(segImage);
            console.log(`Generated image ${i + 2}/${totalImages}`);
        }

        // Step 5: Generate TTS audio
        console.log('\nSTEP 5: Generating Narration');

        // Intro audio
        const introAudio = await generateTTS(script.intro);
        const audioFiles = introAudio ? [introAudio] : [];

        // Segment audio
        for (let i = 0; i < script.segments.length; i++) {
            const segAudio = await generateTTS(script.segments[i].text);
            if (segAudio) audioFiles.push(segAudio);
        }

        // Outro audio
        const outroAudio = await generateTTS(script.outro);
        if (outroAudio) audioFiles.push(outroAudio);

        // Step 6: Create project
        console.log('\nSTEP 6: Creating Video Project');
        const project = createVideoProject(summarizedStory, script, images);
        project.audio.narration = audioFiles.filter(f => f !== null);

        // Save project
        const projectPath = path.join(CONFIG.OUTPUT_DIR, `project-${project.id}.json`);
        fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
        console.log(`Project saved: ${projectPath}`);

        // Save subtitles
        const srtPath = path.join(CONFIG.OUTPUT_DIR, `subtitles-${project.id}.srt`);
        fs.writeFileSync(srtPath, project.subtitles);
        console.log(`Subtitles saved: ${srtPath}`);

        // Save story info
        const storyPath = path.join(CONFIG.OUTPUT_DIR, `story-${project.id}.txt`);
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
        console.log(`\nTo render final video, run: node render-video.js`);

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
