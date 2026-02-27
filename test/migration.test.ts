import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { openDatabaseWithRetry } from '../src/main/db/connection';
import { createAbschnitt, createEinsatz, listAbschnitte } from '../src/main/services/einsatz';

describe('migrations', () => {
  it('migrates old abschnitt schema and allows BEREITSTELLUNGSRAUM', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-migration-'));
    const dbPath = path.join(baseDir, 'einsatz.s1control');

    const sqlite = new Database(dbPath);
    try {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS __migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
        CREATE TABLE einsatz (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          fuest_name TEXT NOT NULL,
          uebergeordnete_fuest_name TEXT,
          start TEXT NOT NULL,
          end TEXT,
          status TEXT NOT NULL DEFAULT 'AKTIV'
        );
        CREATE TABLE einsatz_abschnitt (
          id TEXT PRIMARY KEY NOT NULL,
          einsatz_id TEXT NOT NULL REFERENCES einsatz(id),
          name TEXT NOT NULL,
          parent_id TEXT REFERENCES einsatz_abschnitt(id),
          system_typ TEXT NOT NULL CHECK (system_typ IN ('FUEST', 'ANFAHRT', 'LOGISTIK', 'NORMAL')) DEFAULT 'NORMAL'
        );
        CREATE TABLE einsatz_einheit (
          id TEXT PRIMARY KEY NOT NULL,
          einsatz_id TEXT NOT NULL REFERENCES einsatz(id),
          stammdaten_einheit_id TEXT,
          parent_einsatz_einheit_id TEXT REFERENCES einsatz_einheit(id),
          name_im_einsatz TEXT NOT NULL,
          organisation TEXT NOT NULL DEFAULT 'THW',
          aktuelle_staerke INTEGER NOT NULL DEFAULT 0,
          aktuelle_staerke_taktisch TEXT,
          aktueller_abschnitt_id TEXT NOT NULL REFERENCES einsatz_abschnitt(id),
          status TEXT NOT NULL DEFAULT 'AKTIV',
          tactical_sign_config_json TEXT,
          erstellt TEXT NOT NULL,
          aufgeloest TEXT
        );
        CREATE TABLE einsatz_fahrzeug (
          id TEXT PRIMARY KEY NOT NULL,
          einsatz_id TEXT NOT NULL REFERENCES einsatz(id),
          stammdaten_fahrzeug_id TEXT,
          parent_einsatz_fahrzeug_id TEXT REFERENCES einsatz_fahrzeug(id),
          aktuelle_einsatz_einheit_id TEXT REFERENCES einsatz_einheit(id),
          aktueller_abschnitt_id TEXT REFERENCES einsatz_abschnitt(id),
          status TEXT NOT NULL DEFAULT 'AKTIV',
          erstellt TEXT NOT NULL,
          entfernt TEXT
        );
      `);
      const now = new Date().toISOString();
      const insert = sqlite.prepare('INSERT INTO __migrations (name, applied_at) VALUES (?, ?)');
      insert.run('0000_initial.sql', now);
      insert.run('0001_einheit_taktische_staerke.sql', now);
      insert.run('0002_einheit_organisation.sql', now);
      insert.run('0003_tactical_sign_config.sql', now);
    } finally {
      sqlite.close();
    }

    const ctx = openDatabaseWithRetry(dbPath);
    try {
      const einsatz = createEinsatz(ctx, { name: 'Migrationstest', fuestName: 'FüSt 1' });
      const root = listAbschnitte(ctx, einsatz.id)[0]!;

      const created = createAbschnitt(ctx, {
        einsatzId: einsatz.id,
        name: 'BR Nord',
        systemTyp: 'BEREITSTELLUNGSRAUM',
        parentId: root.id,
      });
      expect(created.systemTyp).toBe('BEREITSTELLUNGSRAUM');
    } finally {
      ctx.sqlite.close();
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });
});
