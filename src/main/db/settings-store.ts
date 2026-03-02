import fs from 'node:fs';
import path from 'node:path';

interface SettingsFile {
  dbPath?: string;
  lanPeerUpdatesEnabled?: boolean;
  recentEinsatzDbPaths?: string[];
  recentEinsatzUsageByPath?: Record<string, string>;
  lastOpenedEinsatzId?: string;
}

export class SettingsStore {
  private readonly filePath: string;

  /**
   * Creates an instance of this class.
   */
  public constructor(baseDir: string) {
    this.filePath = path.join(baseDir, 'settings.json');
  }

  /**
   * Handles Get.
   */
  public get(): SettingsFile {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(raw) as SettingsFile;
    } catch {
      return {};
    }
  }

  /**
   * Handles Set.
   */
  public set(next: SettingsFile): void {
    const merged: SettingsFile = {
      ...this.get(),
      ...next,
    };
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(merged, null, 2));
  }
}
