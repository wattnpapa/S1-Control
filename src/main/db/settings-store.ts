import fs from 'node:fs';
import path from 'node:path';

interface SettingsFile {
  dbPath?: string;
}

export class SettingsStore {
  private readonly filePath: string;

  public constructor(baseDir: string) {
    this.filePath = path.join(baseDir, 'settings.json');
  }

  public get(): SettingsFile {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(raw) as SettingsFile;
    } catch {
      return {};
    }
  }

  public set(next: SettingsFile): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(next, null, 2));
  }
}
