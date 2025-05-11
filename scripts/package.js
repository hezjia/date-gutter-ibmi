const fs = require('fs');
const { execSync } = require('child_process');
const packageJson = require('../package.json');

const extensionName = packageJson.name;
const version = packageJson.version;
const vsixFileName = `${extensionName}-${version}.vsix`;

// 确保dist目录存在
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// 执行打包命令
try {
  execSync(`vsce package --no-dependencies --out dist/${vsixFileName}`, { stdio: 'inherit' });
  console.log(`\nSuccessfully packaged: ${vsixFileName}`);
} catch (error) {
  console.error('Packaging failed:', error);
  process.exit(1);
}