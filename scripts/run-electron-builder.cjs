const { spawnSync } = require('node:child_process');

function toNatoVersionTag(date) {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const mon = months[date.getUTCMonth()] || 'jan';
  const yy = String(date.getUTCFullYear()).slice(-2);
  return `${dd}${hh}${mm}${mon}${yy}`;
}

const version = process.env.S1_APP_VERSION || toNatoVersionTag(new Date());
const args = process.argv.slice(2);
const targetsMac = args.some((arg) => arg === '--mac' || arg.startsWith('--mac='));
const versionConfigArgs = targetsMac
  ? [
      `--config.mac.extendInfo.CFBundleShortVersionString=${version}`,
      `--config.mac.extendInfo.CFBundleVersion=${version}`,
    ]
  : [];

const result = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['exec', 'electron-builder', '--', ...args, ...versionConfigArgs],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      S1_APP_VERSION: version,
    },
  },
);

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
