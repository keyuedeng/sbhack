"use strict";
/**
 * Test/Example: Text-to-Speech Service
 *
 * This file demonstrates how the TTS service works
 * Run with: npx ts-node src/backend/src/services/test.tts.example.ts
 *
 * Make sure DEEPGRAM_API_KEY is set in your .env file
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.samplePatientResponses = void 0;
exports.testTTS = testTTS;
// Load environment variables
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ttsService_1 = require("./ttsService");
const path = __importStar(require("path"));
/**
 * Sample patient responses to test TTS
 */
const samplePatientResponses = [
    "Hello, I'm Sarah Johnson. I have chest pain for 2 hours.",
    "It's in the center of my chest, and yes, it goes to my left arm and jaw.",
    "I have hypertension, diabetes, and high cholesterol. I take lisinopril, metformin, and atorvastatin.",
    "The pain started about two hours ago while I was watching TV. It came on suddenly and it's been pretty constant since then.",
    "It feels like a pressure or squeezing sensation. On a scale of 1 to 10, I'd say it's about a 7 or 8.",
    "Yes, I do get short of breath when I try to walk around. I also feel a bit nauseous.",
];
exports.samplePatientResponses = samplePatientResponses;
/**
 * Test TTS generation
 */
async function testTTS() {
    console.log('🎤 Text-to-Speech Service - Test Example\n');
    console.log('='.repeat(70));
    // Check if API key is set
    if (!process.env.DEEPGRAM_API_KEY) {
        console.error('❌ Error: DEEPGRAM_API_KEY environment variable is not set');
        console.log('\n📝 To fix this:');
        console.log('   1. Create a .env file in the project root (if it doesn\'t exist)');
        console.log('   2. Add: DEEPGRAM_API_KEY=your_api_key_here');
        console.log('   3. Get your API key from: https://console.deepgram.com/');
        process.exit(1);
    }
    console.log('\n✅ DEEPGRAM_API_KEY is set');
    console.log('\n📝 Sample patient responses to convert to speech:\n');
    try {
        // Test with first sample
        const testText = samplePatientResponses[0];
        console.log(`📄 Text: "${testText}"\n`);
        console.log('🔄 Generating speech...\n');
        const startTime = Date.now();
        const audioUrl = await (0, ttsService_1.generateSpeech)(testText);
        const duration = Date.now() - startTime;
        // Get absolute path for display
        const audioDir = path.join(process.cwd(), 'src', 'backend', 'public', 'audio');
        const filename = path.basename(audioUrl);
        const filepath = path.join(audioDir, filename);
        console.log('✅ Speech generated successfully!\n');
        console.log('📊 Details:');
        console.log(`   Audio URL: ${audioUrl}`);
        console.log(`   File path: ${filepath}`);
        console.log(`   Generation time: ${duration}ms\n`);
        console.log('🎧 How to listen to the audio:\n');
        console.log('   Option 1: Open in browser');
        console.log(`      http://localhost:3000${audioUrl}\n`);
        console.log('   Option 2: Play directly from terminal (macOS):');
        console.log(`      open ${filepath}\n`);
        console.log('   Option 3: Play directly from terminal (Linux):');
        console.log(`      xdg-open ${filepath}\n`);
        console.log('   Option 4: Use any audio player:');
        console.log(`      Open: ${filepath}\n`);
        console.log('='.repeat(70));
        console.log('\n💡 Tip: Start the backend server (npm run dev) and then:');
        console.log(`   Open http://localhost:3000${audioUrl} in your browser\n`);
        // Optionally test all samples
        console.log('📋 Would you like to test all sample responses?');
        console.log('   (Uncomment the code below to test all samples)\n');
        // Uncomment to test all samples:
        /*
        console.log('\n🔄 Testing all sample responses...\n');
        for (let i = 0; i < samplePatientResponses.length; i++) {
          const text = samplePatientResponses[i];
          console.log(`\n[${i + 1}/${samplePatientResponses.length}] "${text.substring(0, 50)}..."`);
          try {
            const url = await generateSpeech(text);
            console.log(`   ✅ Generated: ${url}`);
          } catch (error: any) {
            console.log(`   ❌ Error: ${error.message}`);
          }
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        */
    }
    catch (error) {
        console.error('\n❌ Error generating speech:', error.message);
        console.error('\n📋 Troubleshooting:');
        console.error('   1. Check that DEEPGRAM_API_KEY is correct');
        console.error('   2. Verify your Deepgram account has TTS credits');
        console.error('   3. Check your internet connection');
        console.error('   4. Review the error message above for details');
        if (error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        process.exit(1);
    }
}
// Run if executed directly
if (require.main === module) {
    testTTS().catch(console.error);
}
