/**
 * Story Video Generator
 * Generates 1-minute animated story videos with AI narration, subtitles, and subscribe button
 */

const axios = require('axios');
const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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
        voice: 'alloy',
        model: 'tts-1',
        speed: 1.0
    },
    
    // Output Directory
    OUTPUT_DIR: './output'
};

// Initialize RSS Parser
const parser = new Parser();

// Create directories
function init() {
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }
    console.log('✅ Story Video Generator initialized');
    console.log(`📁 Output directory: ${CONFIG.OUTPUT_DIR}`);
}

// Fetch random story from RSS
async function fetchRandomStory() {
    console.log('\n🔍 Fetching stories from RSS sources...');
    
    const stories = [];
    
    for (const source of CONFIG.RSS_SOURCES) {
        try {
            console.log(`   📥 Fetching from ${source.name}...`);
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
            
            console.log(`   ✅ Got ${feed.items.length} stories from ${source.name}`);
        } catch (err) {
            console.log(`   ⚠️ Failed to fetch from ${source.name}: ${err.message}`);
        }
    }
    
    if (stories.length === 0) {
        throw new Error('No stories found from any source');
    }
    
    // Return random story
    const randomIndex = Math.floor(Math.random() * stories.length);
    const selectedStory = stories[randomIndex];
    
    console.log(`\n📖 Selected story: "${selectedStory.title}"`);
    console.log(`   Source: ${selectedStory.source}`);
    
    return selectedStory;
}

// Clean and summarize story for video
function summarizeStory(story, maxWords = 180) {
    // Extract key points from description
    const content = story.description
        .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
        .replace(/\s+/g, ' ')       // Normalize whitespace
        .trim();
    
    // Take first 500 chars as hook, then more content
    let summary = content.substring(0, 800);
    
    // Find a good breaking point (sentence end)
    const lastPeriod = summary.lastIndexOf('. ');
    if (lastPeriod > 200) {
        summary = summary.substring(0, lastPeriod + 1);
    }
    
    // Split into segments for video
    const segments = splitIntoSegments(summary, 5);
    
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

// Generate narration script (simplified - no API key needed for demo)
function generateScript(story) {
    const segments = story.segments;
    
    const script = {
        intro: `Today, let's explore an incredible story: ${story.title}`,
        segments: segments.map((text, i) => ({
            text,
            duration: 8  // 8 seconds per segment
        })),
        outro: `What do you think about this story? Leave a comment below! Don't forget to subscribe for more amazing stories!`
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
    srt += `${formatSRTTime(currentTime)} --> 00:01:00,000\n`;
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

// Generate placeholder image (for demo purposes)
async function generatePlaceholderImage(text, index) {
    // In production, use DALL-E or Stable Diffusion
    // For demo, create a simple colored image with text
    
    const colors = [
        '#667eea', '#764ba2', '#f093fb', '#f5576c', 
        '#4facfe', '#00f2fe', '#43e97b', '#fa709a'
    ];
    
    const color = colors[index % colors.length];
    
    return {
        color,
        text: text.substring(0, 30) + '...'
    };
}

// Create video project structure (for FFmpeg/MoviePy)
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
                content: images[i + 1] || { color: '#1a1a2e', text: seg.text.substring(0, 30) },
                narration: seg.text
            })),
            outro: {
                duration: 7,
                type: 'subscribe',
                animation: 'pulse-bounce'
            }
        },
        audio: {
            narration: null,  // Will be generated
            backgroundMusic: null  // Will be added
        },
        subtitles: generateSRT(script)
    };
    
    return project;
}

// Main function - Generate complete video
async function generateVideo() {
    try {
        console.log('\n🎬 =========================================');
        console.log('   STORY VIDEO GENERATOR');
        console.log('   =========================================\n');
        
        init();
        
        // Step 1: Fetch story
        console.log('\n📖 STEP 1: Fetching Story');
        const story = await fetchRandomStory();
        
        // Step 2: Summarize
        console.log('\n📝 STEP 2: Summarizing Story');
        const summarizedStory = summarizeStory(story);
        
        // Step 3: Generate script
        console.log('\n🎤 STEP 3: Generating Script');
        const script = generateScript(summarizedStory);
        console.log(`   Script length: ${script.segments.length} segments`);
        
        // Step 4: Generate images
        console.log('\n🎨 STEP 4: Generating Images');
        const images = [];
        const totalImages = 1 + script.segments.length;  // Intro + segments
        for (let i = 0; i < totalImages; i++) {
            const img = await generatePlaceholderImage(
                i === 0 ? summarizedStory.title : script.segments[i - 1]?.text || '',
                i
            );
            images.push(img);
            console.log(`   Generated image ${i + 1}/${totalImages}`);
        }
        
        // Step 5: Create project
        console.log('\n🎬 STEP 5: Creating Video Project');
        const project = createVideoProject(summarizedStory, script, images);
        
        // Save project
        const projectPath = path.join(CONFIG.OUTPUT_DIR, `project-${project.id}.json`);
        fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
        console.log(`   Project saved: ${projectPath}`);
        
        // Save subtitles
        const srtPath = path.join(CONFIG.OUTPUT_DIR, `subtitles-${project.id}.srt`);
        fs.writeFileSync(srtPath, project.subtitles);
        console.log(`   Subtitles saved: ${srtPath}`);
        
        // Save story info
        const storyPath = path.join(CONFIG.OUTPUT_DIR, `story-${project.id}.txt`);
        const storyContent = `
Title: ${story.title}
Source: ${story.source}
Link: ${story.link}
---
Script:
${script.intro}
${script.segments.map(s => `- ${s.text}`).join('\n')}
${script.outro}
`.trim();
        fs.writeFileSync(storyPath, storyContent);
        console.log(`   Story saved: ${storyPath}`);
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ VIDEO PROJECT GENERATED!');
        console.log('='.repeat(50));
        console.log(`\n📁 Output Files:`);
        console.log(`   - Project: ${projectPath}`);
        console.log(`   - Subtitles: ${srtPath}`);
        console.log(`   - Story: ${storyPath}`);
        console.log(`\n⚠️  Next Steps (requires API keys):`);
        console.log(`   1. Add OpenAI API key for TTS narration`);
        console.log(`   2. Add DALL-E/Stable Diffusion for images`);
        console.log(`   3. Use MoviePy/FFmpeg to render final video`);
        console.log(`\n💡 To render video, run with proper API keys configured.`);
        
        return project;
        
    } catch (err) {
        console.error(`\n❌ Error: ${err.message}`);
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
