const packager = require('electron-packager');
const path = require('path');
const fs = require('fs-extra');

async function bundle() {
  const rootDir = path.join(__dirname, '..');
  
  console.log('Building portable package with electron-packager...');
  await fs.remove(path.join(rootDir, 'dist/win-unpacked'));

  const appPaths = await packager({
    dir: rootDir,
    name: 'Shell-Gems',
    platform: 'win32',
    arch: 'x64',
    out: path.join(rootDir, 'dist/packager-out'),
    overwrite: true,
    asar: false, // Turn off asar if we want to mimic the previous raw output exactly, or leave it off so edge-js does not crash inside asar. Actually, electron-edge-js has trouble in asar sometimes, so "asar: false" is safer or requires unpacking native modules.
    ignore: (file) => {
       const relativePath = path.relative(rootDir, file).replace(/\\/g, '/');
       if (!relativePath) return false;
       
       const ignores = [
           /^renderer\/(?!dist\/renderer\/browser)/,
           /^MockPlugin/,
           /^docs/,
           /^scripts/,
           /^\.git/,
           /^Shell-Gems-Delivery/,
           /^test-wrapper\.js/,
           /^tsconfig\.json/,
           /^\.vscode/
       ];
       
       return ignores.some(regex => regex.test(relativePath));
    }
  });

  const generatedDir = appPaths[0]; // e.g. dist/packager-out/Shell-Gems-win32-x64
  console.log(`Packaged to ${generatedDir}`);
  
  // rename it to win-unpacked to match our docs and PROGRESS.md setup
  const targetDir = path.join(rootDir, 'dist/win-unpacked');
  await fs.move(generatedDir, targetDir);
  await fs.remove(path.join(rootDir, 'dist/packager-out'));
  
  // Also copy plugins if it doesn't get packaged directly or if we want external plugins
  await fs.copy(path.join(rootDir, 'plugins'), path.join(targetDir, 'plugins'));
  
  console.log('Build completed successfully.');
}

bundle().catch(err => {
    console.error('Packaging failed:', err);
    process.exit(1);
});
