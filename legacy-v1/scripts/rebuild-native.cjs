const { spawnSync } = require('node:child_process');

const electronVersion = require('electron/package.json').version;
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  if (result.error) {
    console.error(result.error);
  }
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(
  npmCmd,
  [
    'rebuild',
    'better-sqlite3',
    '--runtime=electron',
    `--target=${electronVersion}`,
    '--dist-url=https://electronjs.org/headers',
  ],
);
