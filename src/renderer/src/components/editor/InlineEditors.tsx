import { ORGANISATION_OPTIONS } from '@renderer/constants/organisation';
import {
  EinheitFahrzeugeSection,
  type FahrzeugDraft
} from '@renderer/components/editor/shared/EinheitFahrzeugeSection';
import { EinheitHelferSection, type HelferDraft } from '@renderer/components/editor/shared/EinheitHelferSection';
import { TacticalSignSection } from '@renderer/components/editor/shared/TacticalSignSection';
import { useEffect, useState } from 'react';
import type {
  CreateEinheitForm,
  EditEinheitForm,
  EditFahrzeugForm,
  FahrzeugOverviewItem,
  KraftOverviewItem
} from '@renderer/types/ui';
import type { AbschnittNode, EinheitHelfer, OrganisationKey } from '@shared/types';

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

interface InlineEinheitEditorProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: EditEinheitForm;
  onChange: (next: EditEinheitForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
  helfer: EinheitHelfer[];
  onCreateHelfer: (input: {
    name: string;
    rolle: HelferRolle;
    geschlecht: HelferGeschlecht;
    anzahl: number;
    funktion: string;
    telefon: string;
    erreichbarkeit: string;
    vegetarisch: boolean;
    bemerkung: string;
  }) => Promise<void>;
  onUpdateHelfer: (input: {
    helferId: string;
    name: string;
    rolle: HelferRolle;
    geschlecht: HelferGeschlecht;
    anzahl: number;
    funktion: string;
    telefon: string;
    erreichbarkeit: string;
    vegetarisch: boolean;
    bemerkung: string;
  }) => Promise<void>;
  onDeleteHelfer: (helferId: string) => Promise<void>;
  fahrzeuge: FahrzeugOverviewItem[];
  onCreateFahrzeug: (input: {
    name: string;
    kennzeichen: string;
    status: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
    funkrufname: string;
    stanKonform: 'JA' | 'NEIN' | 'UNBEKANNT';
    sondergeraet: string;
    nutzlast: string;
  }) => Promise<void>;
  onUpdateFahrzeug: (input: {
    fahrzeugId: string;
    name: string;
    kennzeichen: string;
    status: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
    funkrufname: string;
    stanKonform: 'JA' | 'NEIN' | 'UNBEKANNT';
    sondergeraet: string;
    nutzlast: string;
  }) => Promise<void>;
}

interface InlineCreateEinheitEditorProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: CreateEinheitForm;
  abschnitte: AbschnittNode[];
  onChange: (next: InlineCreateEinheitEditorProps['form']) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * Handles Inline Einheit Editor.
 */
export function InlineEinheitEditor(props: InlineEinheitEditorProps): JSX.Element | null {
  const helferRows = props.helfer;
  const form = props.form;
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
    setEditRows(next);
  }, [helferRows]);

  useEffect(() => {
    const next: Record<string, FahrzeugDraft> = {};
    for (const row of props.fahrzeuge.filter((item) => item.aktuelleEinsatzEinheitId === form.einheitId)) {
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
    setEditFahrzeuge(next);
  }, [props.fahrzeuge, form.einheitId]);

  useEffect(() => {
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
    const desired = {
      FUEHRER: Math.max(0, Number(form.fuehrung) || 0),
      UNTERFUEHRER: Math.max(0, Number(form.unterfuehrung) || 0),
      HELFER: Math.max(0, Number(form.mannschaft) || 0),
    };
    const deficits = {
      FUEHRER: Math.max(0, desired.FUEHRER - countByRole.FUEHRER),
      UNTERFUEHRER: Math.max(0, desired.UNTERFUEHRER - countByRole.UNTERFUEHRER),
      HELFER: Math.max(0, desired.HELFER - countByRole.HELFER),
    };
    const keys: string[] = [];
    for (let i = 0; i < deficits.FUEHRER; i += 1) keys.push(`auto:FUEHRER:${i}`);
    for (let i = 0; i < deficits.UNTERFUEHRER; i += 1) keys.push(`auto:UNTERFUEHRER:${i}`);
    for (let i = 0; i < deficits.HELFER; i += 1) keys.push(`auto:HELFER:${i}`);

    setAutoRows((prev) => {
      const next: Record<string, HelferDraft> = {};
      for (const key of keys) {
        const rolle = key.includes('FUEHRER:') ? 'FUEHRER' : key.includes('UNTERFUEHRER:') ? 'UNTERFUEHRER' : 'HELFER';
        next[key] = prev[key] ?? {
          ...DEFAULT_HELFER_DRAFT,
          rolle,
          anzahl: 1,
        };
      }
      return next;
    });
  }, [form.fuehrung, form.mannschaft, form.unterfuehrung, helferRows]);

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
          <tr>
            <th>Name im Einsatz</th>
            <td colSpan={3}>
              <input
                value={props.form.nameImEinsatz}
                onChange={(e) => props.onChange({ ...props.form, nameImEinsatz: e.target.value })}
              />
            </td>
          </tr>
          <tr>
            <th>Organisation</th>
            <td>
              <select
                value={props.form.organisation}
                onChange={(e) => props.onChange({ ...props.form, organisation: e.target.value as OrganisationKey })}
              >
                {ORGANISATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </td>
            <th>Status</th>
            <td>
              <select
                value={props.form.status}
                onChange={(e) => props.onChange({ ...props.form, status: e.target.value as EditEinheitForm['status'] })}
              >
                <option value="AKTIV">AKTIV</option>
                <option value="IN_BEREITSTELLUNG">IN_BEREITSTELLUNG</option>
                <option value="ABGEMELDET">ABGEMELDET</option>
              </select>
            </td>
          </tr>
          <tr>
            <th>Führung</th>
            <td>
              <input
                type="number"
                min={0}
                value={props.form.fuehrung}
                onChange={(e) => props.onChange({ ...props.form, fuehrung: e.target.value })}
              />
            </td>
            <th>Unterführung</th>
            <td>
              <input
                type="number"
                min={0}
                value={props.form.unterfuehrung}
                onChange={(e) => props.onChange({ ...props.form, unterfuehrung: e.target.value })}
              />
            </td>
          </tr>
          <tr>
            <th>Mannschaft</th>
            <td>
              <input
                type="number"
                min={0}
                value={props.form.mannschaft}
                onChange={(e) => props.onChange({ ...props.form, mannschaft: e.target.value })}
              />
            </td>
            <th />
            <td />
          </tr>
          <TacticalSignSection
            form={{
              nameImEinsatz: props.form.nameImEinsatz,
              organisation: props.form.organisation,
              tacticalSignMode: props.form.tacticalSignMode,
              tacticalSignUnit: props.form.tacticalSignUnit,
              tacticalSignTyp: props.form.tacticalSignTyp,
              tacticalSignDenominator: props.form.tacticalSignDenominator,
            }}
            onChange={(next) =>
              props.onChange({
                ...props.form,
                tacticalSignMode: next.tacticalSignMode,
                tacticalSignUnit: next.tacticalSignUnit,
                tacticalSignTyp: next.tacticalSignTyp,
                tacticalSignDenominator: next.tacticalSignDenominator,
              })
            }
          />
          <tr>
            <th>GrFü</th>
            <td><input value={props.form.grFuehrerName} onChange={(e) => props.onChange({ ...props.form, grFuehrerName: e.target.value })} /></td>
            <th>OV</th>
            <td><input value={props.form.ovName} onChange={(e) => props.onChange({ ...props.form, ovName: e.target.value })} /></td>
          </tr>
          <tr>
            <th>OV Telefon</th>
            <td><input value={props.form.ovTelefon} onChange={(e) => props.onChange({ ...props.form, ovTelefon: e.target.value })} /></td>
            <th>OV Fax</th>
            <td><input value={props.form.ovFax} onChange={(e) => props.onChange({ ...props.form, ovFax: e.target.value })} /></td>
          </tr>
          <tr>
            <th>RB</th>
            <td><input value={props.form.rbName} onChange={(e) => props.onChange({ ...props.form, rbName: e.target.value })} /></td>
            <th>RB Telefon</th>
            <td><input value={props.form.rbTelefon} onChange={(e) => props.onChange({ ...props.form, rbTelefon: e.target.value })} /></td>
          </tr>
          <tr>
            <th>RB Fax</th>
            <td><input value={props.form.rbFax} onChange={(e) => props.onChange({ ...props.form, rbFax: e.target.value })} /></td>
            <th>LV</th>
            <td><input value={props.form.lvName} onChange={(e) => props.onChange({ ...props.form, lvName: e.target.value })} /></td>
          </tr>
          <tr>
            <th>LV Telefon</th>
            <td><input value={props.form.lvTelefon} onChange={(e) => props.onChange({ ...props.form, lvTelefon: e.target.value })} /></td>
            <th>LV Fax</th>
            <td><input value={props.form.lvFax} onChange={(e) => props.onChange({ ...props.form, lvFax: e.target.value })} /></td>
          </tr>
          <tr>
            <th>Erreichbarkeiten</th>
            <td colSpan={3}>
              <textarea rows={2} value={props.form.erreichbarkeiten} onChange={(e) => props.onChange({ ...props.form, erreichbarkeiten: e.target.value })} />
            </td>
          </tr>
          <tr>
            <th>Bemerkung</th>
            <td colSpan={3}>
              <textarea rows={2} value={props.form.bemerkung} onChange={(e) => props.onChange({ ...props.form, bemerkung: e.target.value })} />
            </td>
          </tr>
          <EinheitFahrzeugeSection
            organisation={form.organisation}
            einheitId={form.einheitId}
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
            organisation={form.organisation}
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

/**
 * Handles Inline Create Einheit Editor.
 */
export function InlineCreateEinheitEditor(props: InlineCreateEinheitEditorProps): JSX.Element | null {
  if (!props.visible) {
    return null;
  }

  return (
    <section className="inline-editor">
      <header className="inline-editor-header">
        <h3>Einheit anlegen</h3>
        <div className="inline-editor-actions">
          <button onClick={props.onSubmit} disabled={props.busy || props.isArchived}>
            Anlegen
          </button>
          <button onClick={props.onCancel} disabled={props.busy}>
            Abbrechen
          </button>
        </div>
      </header>
      <table className="inline-form-table">
        <tbody>
          <tr>
            <th>Name im Einsatz</th>
            <td colSpan={3}>
              <input value={props.form.nameImEinsatz} onChange={(e) => props.onChange({ ...props.form, nameImEinsatz: e.target.value })} />
            </td>
          </tr>
          <tr>
            <th>Organisation</th>
            <td>
              <select value={props.form.organisation} onChange={(e) => props.onChange({ ...props.form, organisation: e.target.value as OrganisationKey })}>
                {ORGANISATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </td>
            <th>Status</th>
            <td>
              <select value={props.form.status} onChange={(e) => props.onChange({ ...props.form, status: e.target.value as InlineCreateEinheitEditorProps['form']['status'] })}>
                <option value="AKTIV">AKTIV</option>
                <option value="IN_BEREITSTELLUNG">IN_BEREITSTELLUNG</option>
                <option value="ABGEMELDET">ABGEMELDET</option>
              </select>
            </td>
          </tr>
          <tr>
            <th>Abschnitt</th>
            <td colSpan={3}>
              <select value={props.form.abschnittId} onChange={(e) => props.onChange({ ...props.form, abschnittId: e.target.value })}>
                <option value="">Bitte wählen</option>
                {props.abschnitte.map((abschnitt) => (
                  <option key={abschnitt.id} value={abschnitt.id}>
                    {abschnitt.name} [{abschnitt.systemTyp}]
                  </option>
                ))}
              </select>
            </td>
          </tr>
          <tr>
            <th>Führung</th>
            <td><input type="number" min={0} value={props.form.fuehrung} onChange={(e) => props.onChange({ ...props.form, fuehrung: e.target.value })} /></td>
            <th>Unterführung</th>
            <td><input type="number" min={0} value={props.form.unterfuehrung} onChange={(e) => props.onChange({ ...props.form, unterfuehrung: e.target.value })} /></td>
          </tr>
          <tr>
            <th>Mannschaft</th>
            <td><input type="number" min={0} value={props.form.mannschaft} onChange={(e) => props.onChange({ ...props.form, mannschaft: e.target.value })} /></td>
            <th />
            <td />
          </tr>
          <TacticalSignSection
            form={{
              nameImEinsatz: props.form.nameImEinsatz,
              organisation: props.form.organisation,
              tacticalSignMode: props.form.tacticalSignMode,
              tacticalSignUnit: props.form.tacticalSignUnit,
              tacticalSignTyp: props.form.tacticalSignTyp,
              tacticalSignDenominator: props.form.tacticalSignDenominator,
            }}
            onChange={(next) =>
              props.onChange({
                ...props.form,
                tacticalSignMode: next.tacticalSignMode,
                tacticalSignUnit: next.tacticalSignUnit,
                tacticalSignTyp: next.tacticalSignTyp,
                tacticalSignDenominator: next.tacticalSignDenominator,
              })
            }
          />
          <tr>
            <th>GrFü</th>
            <td><input value={props.form.grFuehrerName} onChange={(e) => props.onChange({ ...props.form, grFuehrerName: e.target.value })} /></td>
            <th>OV</th>
            <td><input value={props.form.ovName} onChange={(e) => props.onChange({ ...props.form, ovName: e.target.value })} /></td>
          </tr>
          <tr>
            <th>OV Telefon</th>
            <td><input value={props.form.ovTelefon} onChange={(e) => props.onChange({ ...props.form, ovTelefon: e.target.value })} /></td>
            <th>OV Fax</th>
            <td><input value={props.form.ovFax} onChange={(e) => props.onChange({ ...props.form, ovFax: e.target.value })} /></td>
          </tr>
          <tr>
            <th>RB</th>
            <td><input value={props.form.rbName} onChange={(e) => props.onChange({ ...props.form, rbName: e.target.value })} /></td>
            <th>RB Telefon</th>
            <td><input value={props.form.rbTelefon} onChange={(e) => props.onChange({ ...props.form, rbTelefon: e.target.value })} /></td>
          </tr>
          <tr>
            <th>RB Fax</th>
            <td><input value={props.form.rbFax} onChange={(e) => props.onChange({ ...props.form, rbFax: e.target.value })} /></td>
            <th>LV</th>
            <td><input value={props.form.lvName} onChange={(e) => props.onChange({ ...props.form, lvName: e.target.value })} /></td>
          </tr>
          <tr>
            <th>LV Telefon</th>
            <td><input value={props.form.lvTelefon} onChange={(e) => props.onChange({ ...props.form, lvTelefon: e.target.value })} /></td>
            <th>LV Fax</th>
            <td><input value={props.form.lvFax} onChange={(e) => props.onChange({ ...props.form, lvFax: e.target.value })} /></td>
          </tr>
          <tr>
            <th>Erreichbarkeiten</th>
            <td colSpan={3}>
              <textarea rows={2} value={props.form.erreichbarkeiten} onChange={(e) => props.onChange({ ...props.form, erreichbarkeiten: e.target.value })} />
            </td>
          </tr>
          <tr>
            <th>Bemerkung</th>
            <td colSpan={3}>
              <textarea rows={2} value={props.form.bemerkung} onChange={(e) => props.onChange({ ...props.form, bemerkung: e.target.value })} />
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

interface InlineFahrzeugEditorProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: EditFahrzeugForm;
  allKraefte: KraftOverviewItem[];
  onChange: (next: EditFahrzeugForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * Handles Inline Fahrzeug Editor.
 */
export function InlineFahrzeugEditor(props: InlineFahrzeugEditorProps): JSX.Element | null {
  if (!props.visible) {
    return null;
  }

  return (
    <section className="inline-editor">
      <header className="inline-editor-header">
        <h3>Fahrzeug bearbeiten</h3>
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
          <tr>
            <th>Fahrzeugname</th>
            <td><input value={props.form.name} onChange={(e) => props.onChange({ ...props.form, name: e.target.value })} /></td>
            <th>Kennzeichen</th>
            <td><input value={props.form.kennzeichen} onChange={(e) => props.onChange({ ...props.form, kennzeichen: e.target.value })} /></td>
          </tr>
          <tr>
            <th>Zugeordnete Einheit</th>
            <td>
              <select value={props.form.einheitId} onChange={(e) => props.onChange({ ...props.form, einheitId: e.target.value })}>
                <option value="">Bitte wählen</option>
                {props.allKraefte.map((einheit) => (
                  <option key={einheit.id} value={einheit.id}>
                    {einheit.nameImEinsatz} ({einheit.abschnittName})
                  </option>
                ))}
              </select>
            </td>
            <th>Status</th>
            <td>
              <select
                value={props.form.status}
                onChange={(e) => props.onChange({ ...props.form, status: e.target.value as EditFahrzeugForm['status'] })}
              >
                <option value="AKTIV">AKTIV</option>
                <option value="IN_BEREITSTELLUNG">IN_BEREITSTELLUNG</option>
                <option value="AUSSER_BETRIEB">AUSSER_BETRIEB</option>
              </select>
            </td>
          </tr>
          <tr>
            <th>FuRn</th>
            <td><input value={props.form.funkrufname} onChange={(e) => props.onChange({ ...props.form, funkrufname: e.target.value })} /></td>
            <th>STAN-konform</th>
            <td>
              <select
                value={props.form.stanKonform}
                onChange={(e) => props.onChange({ ...props.form, stanKonform: e.target.value as EditFahrzeugForm['stanKonform'] })}
              >
                <option value="UNBEKANNT">unbekannt</option>
                <option value="JA">ja</option>
                <option value="NEIN">nein</option>
              </select>
            </td>
          </tr>
          <tr>
            <th>Nutzlast</th>
            <td><input value={props.form.nutzlast} onChange={(e) => props.onChange({ ...props.form, nutzlast: e.target.value })} /></td>
            <th />
            <td />
          </tr>
          <tr>
            <th>Sondergerät / Änderungen</th>
            <td colSpan={3}>
              <textarea rows={3} value={props.form.sondergeraet} onChange={(e) => props.onChange({ ...props.form, sondergeraet: e.target.value })} />
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
