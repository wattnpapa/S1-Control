const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sha512Base64(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha512').update(data).digest('base64');
}

function chooseArtifact(platform, distDir) {
  const files = fs.readdirSync(distDir);

  if (platform === 'mac') {
    return files.find((name) => name.endsWith('.zip') && name.includes('-mac-')) ?? null;
  }
  if (platform === 'win') {
    return files.find((name) => name.endsWith('.exe') && name.includes('-win-') && !name.endsWith('.blockmap')) ?? null;
  }
  if (platform === 'linux') {
    return files.find((name) => name.endsWith('.deb') && name.includes('-linux-')) ?? null;
  }
  return null;
}

function targetFileName(platform) {
  if (platform === 'mac') return 'latest-mac.yml';
  if (platform === 'win') return 'latest.yml';
  if (platform === 'linux') return 'latest-linux.yml';
  return null;
}

function buildYaml(version, artifactName, size, sha512) {
  const releaseDate = new Date().toISOString();
  return [
    `version: ${version}`,
    `files:`,
    `  - url: ${artifactName}`,
    `    sha512: ${sha512}`,
    `    size: ${size}`,
    `path: ${artifactName}`,
    `sha512: ${sha512}`,
    `releaseDate: '${releaseDate}'`,
    ``,
  ].join('\n');
}

function main() {
  const platform = process.argv[2];
  if (!platform || !['mac', 'win', 'linux'].includes(platform)) {
    fail('Usage: node scripts/ensure-update-metadata.cjs <mac|win|linux>');
  }

  const distDir = path.resolve(process.cwd(), 'dist');
  const target = targetFileName(platform);
  const targetPath = path.join(distDir, target);
  if (fs.existsSync(targetPath)) {
    console.log(`exists: ${target}`);
    return;
  }

  const artifact = chooseArtifact(platform, distDir);
  if (!artifact) {
    fail(`Cannot create ${target}: no matching artifact found in dist/`);
  }

  const artifactPath = path.join(distDir, artifact);
  const stat = fs.statSync(artifactPath);
  const sha512 = sha512Base64(artifactPath);
  const version = process.env.S1_APP_SEMVER || process.env.BUILD_SEMVER || process.env.BUILD_VERSION;
  if (!version) {
    fail(`Cannot create ${target}: missing S1_APP_SEMVER/BUILD_SEMVER/BUILD_VERSION env`);
  }

  fs.writeFileSync(targetPath, buildYaml(version, artifact, stat.size, sha512), 'utf8');
  console.log(`created: ${target}`);
}

main();
