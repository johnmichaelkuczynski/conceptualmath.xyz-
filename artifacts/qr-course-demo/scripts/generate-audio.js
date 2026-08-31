const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const audioDir = path.join(__dirname, '..', 'public', 'audio');

const scripts = [
  "A new standard for college mathematics.",
  "Optimize instruction. Scalable capacity with comprehensive faculty support, reducing operating costs.",
  "Unlimited practice. Algorithmic homework generation ensures absolute mastery of every concept.",
  "Surgical analytics provide specialized training exactly when needed, keeping students always on track.",
  "Enterprise Mathematics. Scalable, effective, economical."
];

async function generate() {
  for (let i = 0; i < scripts.length; i++) {
    const text = scripts[i];
    const outputFile = path.join(audioDir, `vo_s${i+1}.mp3`);
    console.log(`Generating Scene ${i+1}...`);
    
    // We use a simple free TTS api for the sake of the demo
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;
    try {
        execSync(`curl -sL "${url}" -o "${outputFile}"`);
    } catch (e) {
        console.error(`Failed to generate ${outputFile}`);
    }
  }
}
generate();
