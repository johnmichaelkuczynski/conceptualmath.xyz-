const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const audioDir = path.join(__dirname, '..', 'public', 'audio');

const scripts = [
  "Colleges spend millions of dollars on remedial math programs.",
  "Yet up to 80 percent of students drop or fail the course completely.",
  "Z H I supplements instructors, expands capacity, and reduces operating costs without removing support.",
  "Improve outcomes with unlimited practice, continuous guidance, and analytics that prescribe specialized training.",
  "Reduce remedial math costs and improve completion. Visit Z H I systems dot A I."
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
