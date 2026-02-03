/**
 * Story Video Generator - Test Script
 */

const { fetchRandomStory, summarizeStory, generateScript, generateSRT } = require('./generator');

async function test() {
    console.log('🧪 Testing Story Video Generator\n');
    console.log('='.repeat(50));
    
    try {
        // Test 1: Fetch story
        console.log('\n📖 Test 1: Fetch Story');
        const story = await fetchRandomStory();
        console.log('✅ Story fetched successfully');
        console.log(`   Title: ${story.title}`);
        console.log(`   Source: ${story.source}`);
        
        // Test 2: Summarize
        console.log('\n📝 Test 2: Summarize Story');
        const summarized = summarizeStory(story);
        console.log('✅ Story summarized');
        console.log(`   Segments: ${summarized.segments.length}`);
        console.log(`   Preview: ${summarized.segments[0]?.substring(0, 50)}...`);
        
        // Test 3: Generate script
        console.log('\n🎤 Test 3: Generate Script');
        const script = generateScript(summarized);
        console.log('✅ Script generated');
        console.log(`   Intro: ${script.intro.substring(0, 50)}...`);
        console.log(`   Segments: ${script.segments.length}`);
        console.log(`   Outro: ${script.outro.substring(0, 50)}...`);
        
        // Test 4: Generate SRT
        console.log('\n💬 Test 4: Generate SRT Subtitles');
        const srt = generateSRT(script);
        console.log('✅ SRT generated');
        console.log(`   Lines: ${srt.split('\n').length}`);
        console.log(`   Preview:\n${srt.substring(0, 300)}...`);
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ All tests passed!');
        console.log('='.repeat(50));
        
        return {
            story,
            summarized,
            script,
            srt
        };
        
    } catch (err) {
        console.error('\n❌ Test failed:', err.message);
        throw err;
    }
}

if (require.main === module) {
    test()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { test };
