const { execFileSync } = require('child_process');
const path = require('path');

const scripts = [
  'make-small-promo.js',
  'make-marquee.js',
  'make-x-banner.js',
  'make-yt-thumbnail.js',
  'make-yt-banner.js',
  'make-store-screenshot.js',
  'make-screenshots.js',
];

for (const script of scripts) {
  execFileSync(process.execPath, [path.join(__dirname, script)], { stdio: 'inherit' });
}
