import { EinheitFahrzeugeSection } from '@renderer/components/editor/shared/EinheitFahrzeugeSection';
import { EinheitHelferSection } from '@renderer/components/editor/shared/EinheitHelferSection';
import {
  EinheitContactRows,
  EinheitIdentityRows,
  EinheitNotesRows,
  EinheitStrengthRows,
  EinheitTacticalRows,
} from './EinheitFormRows';
import { useEffect, useState } from 'react';
import type { FahrzeugDraft, HelferDraft, InlineEinheitEditorProps } from './types';

const DEFAULT_HELFER_DRAFT: HelferDraft = {
  name: '',
  rolle: 'HELFER',
  geschlecht: 'MAENNLICH',
  anzahl: 1,
  funktion: '',
  telefon: '',
  erreichbarkeit: '',
  vegetarisch: false,
  bemerkung: '',
};

/**
 * Builds helper rows from persisted unit personnel records.
 */
function buildEditRows(helferRows: InlineEinheitEditorProps['helfer']) {
  const next: Record<string, HelferDraft> = {};
  for (const row of helferRows) {
    next[row.id] = {
      name: row.name,
      rolle: row.rolle,
      geschlecht: row.geschlecht,
      anzahl: row.anzahl,
      funktion: row.funktion ?? '',
      telefon: row.telefon ?? '',
      erreichbarkeit: row.erreichbarkeit ?? '',
      vegetarisch: row.vegetarisch,
      bemerkung: row.bemerkung ?? '',
    };
  }
  return next;
}

/**
 * Builds editable vehicle draft rows scoped to one unit.
 */
function buildEditFahrzeuge(fahrzeuge: InlineEinheitEditorProps['fahrzeuge'], einheitId: string) {
  const next: Record<string, FahrzeugDraft> = {};
  for (const row of fahrzeuge.filter((item) => item.aktuelleEinsatzEinheitId === einheitId)) {
    next[row.id] = {
      name: row.name,
      kennzeichen: row.kennzeichen ?? '',
      status: row.status,
      funkrufname: row.funkrufname ?? '',
      stanKonform: row.stanKonform === null ? 'UNBEKANNT' : row.stanKonform ? 'JA' : 'NEIN',
      sondergeraet: row.sondergeraet ?? '',
      nutzlast: row.nutzlast ?? '',
    };
  }
  return next;
}

/**
 * Pushes auto helper keys for a role into target list.
 */
function appendRoleKeys(target: string[], role: 'FUEHRER' | 'UNTERFUEHRER' | 'HELFER', count: number) {
  for (let i = 0; i < count; i += 1) {
    target.push(`auto:${role}:${i}`);
  }
}

/**
 * Computes auto helper rows based on tactical strength deficits.
 */
function nextAutoRows(prev: Record<string, HelferDraft>, form: InlineEinheitEditorProps['form'], helferRows: InlineEinheitEditorProps['helfer']) {
  const countByRole = helferRows.reduce(
    (acc, item) => {
      const amount = Math.max(1, Math.round(item.anzahl ?? 1));
      if (item.rolle === 'FUEHRER') acc.FUEHRER += amount;
      else if (item.rolle === 'UNTERFUEHRER') acc.UNTERFUEHRER += amount;
      else acc.HELFER += amount;
      return acc;
    },
    { FUEHRER: 0, UNTERFUEHRER: 0, HELFER: 0 },
  );
  const deficits = {
    FUEHRER: Math.max(0, (Number(form.fuehrung) || 0) - countByRole.FUEHRER),
    UNTERFUEHRER: Math.max(0, (Number(form.unterfuehrung) || 0) - countByRole.UNTERFUEHRER),
    HELFER: Math.max(0, (Number(form.mannschaft) || 0) - countByRole.HELFER),
  };
  const keys: string[] = [];
  appendRoleKeys(keys, 'FUEHRER', deficits.FUEHRER);
  appendRoleKeys(keys, 'UNTERFUEHRER', deficits.UNTERFUEHRER);
  appendRoleKeys(keys, 'HELFER', deficits.HELFER);

  const next: Record<string, HelferDraft> = {};
  for (const key of keys) {
    const rolle = key.includes('FUEHRER:') ? 'FUEHRER' : key.includes('UNTERFUEHRER:') ? 'UNTERFUEHRER' : 'HELFER';
    next[key] = prev[key] ?? { ...DEFAULT_HELFER_DRAFT, rolle, anzahl: 1 };
  }
  return next;
}

/**
 * Renders inline edit form for existing unit records.
 */
export function InlineEinheitEditor(props: InlineEinheitEditorProps): JSX.Element | null {
  const [editRows, setEditRows] = useState<Record<string, HelferDraft>>({});
  const [autoRows, setAutoRows] = useState<Record<string, HelferDraft>>({});
  const [newFahrzeug, setNewFahrzeug] = useState<FahrzeugDraft>({
    name: '',
    kennzeichen: '',
    status: 'AKTIV',
    funkrufname: '',
    stanKonform: 'UNBEKANNT',
    sondergeraet: '',
    nutzlast: '',
  });
  const [editFahrzeuge, setEditFahrzeuge] = useState<Record<string, FahrzeugDraft>>({});

  useEffect(() => {
    setEditRows(buildEditRows(props.helfer));
  }, [props.helfer]);

  useEffect(() => {
    setEditFahrzeuge(buildEditFahrzeuge(props.fahrzeuge, props.form.einheitId));
  }, [props.fahrzeuge, props.form.einheitId]);

  useEffect(() => {
    setAutoRows((prev) => nextAutoRows(prev, props.form, props.helfer));
  }, [props.form, props.helfer]);

  if (!props.visible) {
    return null;
  }

  return (
    <section className="inline-editor">
      <header className="inline-editor-header">
        <h3>Einheit bearbeiten</h3>
        <div className="inline-editor-actions">
          <button onClick={props.onSubmit} disabled={props.busy || props.isArchived}>
            Speichern
          </button>
          <button onClick={props.onCancel} disabled={props.busy}>
            Abbrechen
          </button>
        </div>
      </header>
      <table className="inline-form-table">
        <tbody>
          <EinheitIdentityRows form={props.form} onChange={props.onChange} />
          <EinheitStrengthRows form={props.form} onChange={props.onChange} />
          <EinheitTacticalRows form={props.form} onChange={props.onChange} />
          <EinheitContactRows form={props.form} onChange={props.onChange} />
          <EinheitNotesRows form={props.form} onChange={props.onChange} />
          <EinheitFahrzeugeSection
            organisation={props.form.organisation}
            einheitId={props.form.einheitId}
            fahrzeuge={props.fahrzeuge}
            editFahrzeuge={editFahrzeuge}
            setEditFahrzeuge={setEditFahrzeuge}
            newFahrzeug={newFahrzeug}
            setNewFahrzeug={setNewFahrzeug}
            busy={props.busy}
            isArchived={props.isArchived}
            onCreateFahrzeug={props.onCreateFahrzeug}
            onUpdateFahrzeug={props.onUpdateFahrzeug}
          />
          <EinheitHelferSection
            organisation={props.form.organisation}
            helfer={props.helfer}
            editRows={editRows}
            setEditRows={setEditRows}
            autoRows={autoRows}
            setAutoRows={setAutoRows}
            busy={props.busy}
            isArchived={props.isArchived}
            onCreateHelfer={props.onCreateHelfer}
            onUpdateHelfer={props.onUpdateHelfer}
            onDeleteHelfer={props.onDeleteHelfer}
          />
        </tbody>
      </table>
    </section>
  );
}
