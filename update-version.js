const fs = require('fs');
const path = require('path');

// Read package.json to get version
const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')
);

// Create version info
const versionInfo = {
    version: packageJson.version,
    buildTime: new Date().toISOString()
};

// Write to public/version.json
fs.writeFileSync(
    path.join(__dirname, 'public', 'version.json'),
    JSON.stringify(versionInfo, null, 2)
);

console.log(`✅ Version updated: ${versionInfo.version}`);
console.log(`📅 Build time: ${versionInfo.buildTime}`);
