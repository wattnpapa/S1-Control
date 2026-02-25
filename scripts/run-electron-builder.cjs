const { spawnSync } = require('node:child_process');

function toBuildVersion(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}.${month}.${day}.${hour}.${minute}`;
}

function toSemverVersion(versionLabel) {
  const match = /^(\d{4})\.(\d{2})\.(\d{2})\.(\d{2})\.(\d{2})$/.exec(versionLabel.trim());
  if (!match) {
    return '0.1.0';
  }
  const [, year, month, day, hour, minute] = match;
  return `${Number(year)}.${Number(month)}.${Number(day)}-${Number(hour)}.${Number(minute)}`;
}

const versionLabel = process.env.S1_APP_VERSION || toBuildVersion(new Date());
const semverVersion = process.env.S1_APP_SEMVER || toSemverVersion(versionLabel);
const args = process.argv.slice(2);
const targetsMac = args.some((arg) => arg === '--mac' || arg.startsWith('--mac='));
const versionConfigArgs = targetsMac
  ? [
      `--config.mac.extendInfo.CFBundleShortVersionString=${versionLabel}`,
      `--config.mac.extendInfo.CFBundleVersion=${versionLabel}`,
    ]
  : [];
const metadataVersionArgs = [
  `--config.extraMetadata.version=${semverVersion}`,
  `--config.extraMetadata.s1DisplayVersion=${versionLabel}`,
];

const electronBuilderCli = require.resolve('electron-builder/out/cli/cli.js');

const result = spawnSync(
  process.execPath,
  [electronBuilderCli, ...args, ...versionConfigArgs, ...metadataVersionArgs],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      S1_APP_VERSION: versionLabel,
      S1_APP_SEMVER: semverVersion,
    },
  },
);

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
