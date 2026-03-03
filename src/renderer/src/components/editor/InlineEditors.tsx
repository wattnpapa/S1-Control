import { ORGANISATION_OPTIONS } from '@renderer/constants/organisation';
import { TaktischesZeichenPerson } from '@renderer/components/common/TaktischesZeichenPerson';
import { TaktischesZeichenFahrzeug } from '@renderer/components/common/TaktischesZeichenFahrzeug';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMars, faVenus } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import type {
  CreateEinheitForm,
  EditEinheitForm,
  EditFahrzeugForm,
  FahrzeugOverviewItem,
  KraftOverviewItem,
} from '@renderer/types/ui';
import type { AbschnittNode, EinheitHelfer, HelferGeschlecht, HelferRolle, OrganisationKey, TacticalSignConfig } from '@shared/types';
import { TaktischesZeichenEinheit } from '@renderer/components/common/TaktischesZeichenEinheit';

const DEFAULT_HELFER_DRAFT = {
  name: '',
  rolle: 'HELFER' as HelferRolle,
  geschlecht: 'MAENNLICH' as HelferGeschlecht,
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

type TacticalCatalogItem = Awaited<
  ReturnType<typeof window.api.listTacticalSignCatalog>
>[number];

/**
 * Handles Build Tactical Config.
 */
function buildTacticalConfig(form: {
  nameImEinsatz: string;
  organisation: OrganisationKey;
  tacticalSignMode: 'AUTO' | 'MANUELL';
  tacticalSignUnit: string;
  tacticalSignTyp: NonNullable<TacticalSignConfig['typ']>;
  tacticalSignDenominator: string;
}): TacticalSignConfig {
  return {
    grundform: 'taktische_formation',
    fachaufgabe: 'keine',
    organisation: form.organisation,
    einheit: 'keine',
    verwaltungsstufe: 'keine',
    symbol: 'keines',
    text: '',
    name: form.nameImEinsatz,
    organisationsname: form.organisation,
    unit: form.tacticalSignUnit.trim(),
    typ: form.tacticalSignTyp,
    denominator: form.tacticalSignDenominator.trim() || undefined,
    meta: {
      source: form.tacticalSignMode === 'MANUELL' ? 'manual' : 'auto',
      rawName: form.nameImEinsatz,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Handles Tactical Sign Section.
 */
function TacticalSignSection(props: {
  form: Pick<
    CreateEinheitForm,
    'nameImEinsatz' | 'organisation' | 'tacticalSignMode' | 'tacticalSignUnit' | 'tacticalSignTyp' | 'tacticalSignDenominator'
  >;
  onChange: (
    next: Pick<
      CreateEinheitForm,
      'nameImEinsatz' | 'organisation' | 'tacticalSignMode' | 'tacticalSignUnit' | 'tacticalSignTyp' | 'tacticalSignDenominator'
    >,
  ) => void;
}): JSX.Element {
  const [catalog, setCatalog] = useState<TacticalCatalogItem[]>([]);
  const [search, setSearch] = useState('');
  const [suggestion, setSuggestion] = useState<{
    confidence: number;
    matchedLabel?: string;
    config: TacticalSignConfig;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await window.api.listTacticalSignCatalog({
        organisation: props.form.organisation,
        query: search.trim() || undefined,
      });
      if (!cancelled) {
        setCatalog(list);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.form.organisation, search]);

  useEffect(() => {
    let cancelled = false;
    if (props.form.tacticalSignMode !== 'AUTO') {
      setSuggestion(null);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      const result = await window.api.inferTacticalSign({
        organisation: props.form.organisation,
        nameImEinsatz: props.form.nameImEinsatz,
      });
      if (!cancelled) {
        setSuggestion(result);
        props.onChange({
          ...props.form,
          tacticalSignUnit: result.config.unit ?? '',
          tacticalSignTyp: result.config.typ ?? 'none',
          tacticalSignDenominator: result.config.denominator ?? '',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.form.nameImEinsatz, props.form.organisation, props.form.tacticalSignMode]);

  const previewConfig = buildTacticalConfig(props.form);
  return (
    <>
      <tr>
        <th>Taktisches Zeichen</th>
        <td colSpan={3}>
          <div className="tactical-editor-grid">
            <label className="inline-checkbox">
              <input
                type="radio"
                checked={props.form.tacticalSignMode === 'AUTO'}
                onChange={() => props.onChange({ ...props.form, tacticalSignMode: 'AUTO' })}
              />
              Auto
            </label>
            <label className="inline-checkbox">
              <input
                type="radio"
                checked={props.form.tacticalSignMode === 'MANUELL'}
                onChange={() => props.onChange({ ...props.form, tacticalSignMode: 'MANUELL' })}
              />
              Manuell
            </label>
            <div className="tactical-editor-meta">
              {props.form.tacticalSignMode === 'AUTO' ? (
                <>
                  Vorschlag: {suggestion?.matchedLabel ?? 'kein Treffer'} ({Math.round((suggestion?.confidence ?? 0) * 100)}%)
                </>
              ) : (
                <>Manueller Modus aktiv</>
              )}
            </div>
          </div>
        </td>
      </tr>
      {props.form.tacticalSignMode === 'MANUELL' ? (
        <tr>
          <th>Manuell wählen</th>
          <td colSpan={3}>
            <div className="tactical-editor-grid">
              <input
                placeholder="Suchen..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                value={`${props.form.tacticalSignUnit}|${props.form.tacticalSignTyp}|${props.form.tacticalSignDenominator}`}
                onChange={(event) => {
                  const [unit, typ, denominator] = event.target.value.split('|');
                  props.onChange({
                    ...props.form,
                    tacticalSignUnit: unit ?? '',
                    tacticalSignTyp: (typ as NonNullable<TacticalSignConfig['typ']>) ?? 'none',
                    tacticalSignDenominator: denominator ?? '',
                  });
                }}
              >
                <option value="|none|">-</option>
                {catalog.map((item) => (
                  <option
                    key={item.key}
                    value={`${item.unit}|${item.typ}|${item.denominator ?? ''}`}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
              <input
                placeholder="Unit"
                value={props.form.tacticalSignUnit}
                onChange={(event) => props.onChange({ ...props.form, tacticalSignUnit: event.target.value })}
              />
              <select
                value={props.form.tacticalSignTyp}
                onChange={(event) =>
                  props.onChange({
                    ...props.form,
                    tacticalSignTyp: event.target.value as NonNullable<TacticalSignConfig['typ']>,
                  })
                }
              >
                <option value="none">Keine</option>
                <option value="platoon">Zug</option>
                <option value="group">Gruppe</option>
                <option value="squad">Trupp</option>
                <option value="zugtrupp">Zugtrupp</option>
              </select>
              <input
                placeholder="Denominator"
                value={props.form.tacticalSignDenominator}
                onChange={(event) =>
                  props.onChange({ ...props.form, tacticalSignDenominator: event.target.value })
                }
              />
              <button
                type="button"
                onClick={() => props.onChange({ ...props.form, tacticalSignMode: 'AUTO' })}
              >
                Zurück auf Auto
              </button>
            </div>
          </td>
        </tr>
      ) : null}
      <tr>
        <th>Vorschau</th>
        <td colSpan={3}>
          <div className="tactical-sign-preview-row">
            <div className="tactical-sign-preview-box">
              <TaktischesZeichenEinheit
                organisation={props.form.organisation}
                tacticalSignConfigJson={JSON.stringify(previewConfig)}
              />
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

/**
 * Handles Inline Einheit Editor.
 */
export function InlineEinheitEditor(props: InlineEinheitEditorProps): JSX.Element | null {
  const helferRows = props.helfer;
  const form = props.form;
  const [editRows, setEditRows] = useState<Record<string, typeof DEFAULT_HELFER_DRAFT>>({});
  const [autoRows, setAutoRows] = useState<Record<string, typeof DEFAULT_HELFER_DRAFT>>({});
  const [newFahrzeug, setNewFahrzeug] = useState({
    name: '',
    kennzeichen: '',
    status: 'AKTIV' as const,
    funkrufname: '',
    stanKonform: 'UNBEKANNT' as const,
    sondergeraet: '',
    nutzlast: '',
  });
  const [editFahrzeuge, setEditFahrzeuge] = useState<Record<string, typeof newFahrzeug>>({});

  useEffect(() => {
    const next: Record<string, typeof DEFAULT_HELFER_DRAFT> = {};
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
    const next: Record<string, typeof newFahrzeug> = {};
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
      const next: Record<string, typeof DEFAULT_HELFER_DRAFT> = {};
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
          <tr>
            <th colSpan={4}>Fahrzeuge</th>
          </tr>
          <tr>
            <td colSpan={4}>
              <table className="inline-subtable">
                <thead>
                  <tr>
                    <th />
                    <th>Name</th>
                    <th>Kennzeichen</th>
                    <th>FuRn</th>
                    <th>STAN</th>
                    <th>Sondergerät</th>
                    <th>Nutzlast</th>
                    <th>Status</th>
                    <th>Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {props.fahrzeuge
                    .filter((item) => item.aktuelleEinsatzEinheitId === form.einheitId)
                    .map((row) => {
                      const edit = editFahrzeuge[row.id];
                      if (!edit) return null;
                      return (
                        <tr key={row.id}>
                          <td className="tactical-sign-cell compact-sign-cell">
                            <TaktischesZeichenFahrzeug organisation={row.organisation} />
                          </td>
                          <td>
                            <input
                              value={edit.name}
                              onChange={(e) => setEditFahrzeuge((prev) => ({ ...prev, [row.id]: { ...edit, name: e.target.value } }))}
                            />
                          </td>
                          <td>
                            <input
                              value={edit.kennzeichen}
                              onChange={(e) => setEditFahrzeuge((prev) => ({ ...prev, [row.id]: { ...edit, kennzeichen: e.target.value } }))}
                            />
                          </td>
                          <td>
                            <input
                              value={edit.funkrufname}
                              onChange={(e) => setEditFahrzeuge((prev) => ({ ...prev, [row.id]: { ...edit, funkrufname: e.target.value } }))}
                            />
                          </td>
                          <td>
                            <select
                              value={edit.stanKonform}
                              onChange={(e) =>
                                setEditFahrzeuge((prev) => ({
                                  ...prev,
                                  [row.id]: { ...edit, stanKonform: e.target.value as 'JA' | 'NEIN' | 'UNBEKANNT' },
                                }))
                              }
                            >
                              <option value="UNBEKANNT">unbekannt</option>
                              <option value="JA">ja</option>
                              <option value="NEIN">nein</option>
                            </select>
                          </td>
                          <td>
                            <input
                              value={edit.sondergeraet}
                              onChange={(e) => setEditFahrzeuge((prev) => ({ ...prev, [row.id]: { ...edit, sondergeraet: e.target.value } }))}
                            />
                          </td>
                          <td>
                            <input
                              value={edit.nutzlast}
                              onChange={(e) => setEditFahrzeuge((prev) => ({ ...prev, [row.id]: { ...edit, nutzlast: e.target.value } }))}
                            />
                          </td>
                          <td>
                            <select
                              value={edit.status}
                              onChange={(e) =>
                                setEditFahrzeuge((prev) => ({
                                  ...prev,
                                  [row.id]: { ...edit, status: e.target.value as 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB' },
                                }))
                              }
                            >
                              <option value="AKTIV">AKTIV</option>
                              <option value="IN_BEREITSTELLUNG">IN_BEREITSTELLUNG</option>
                              <option value="AUSSER_BETRIEB">AUSSER BETRIEB</option>
                            </select>
                          </td>
                          <td className="inline-subtable-actions">
                            <button
                              onClick={() =>
                                void props.onUpdateFahrzeug({
                                  fahrzeugId: row.id,
                                  ...edit,
                                })
                              }
                              disabled={props.busy || props.isArchived}
                            >
                              Speichern
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  <tr>
                    <td className="tactical-sign-cell compact-sign-cell">
                      <TaktischesZeichenFahrzeug organisation={form.organisation} />
                    </td>
                    <td>
                      <input
                        value={newFahrzeug.name}
                        onChange={(e) => setNewFahrzeug((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Neues Fahrzeug"
                      />
                    </td>
                    <td>
                      <input value={newFahrzeug.kennzeichen} onChange={(e) => setNewFahrzeug((prev) => ({ ...prev, kennzeichen: e.target.value }))} />
                    </td>
                    <td>
                      <input value={newFahrzeug.funkrufname} onChange={(e) => setNewFahrzeug((prev) => ({ ...prev, funkrufname: e.target.value }))} />
                    </td>
                    <td>
                      <select
                        value={newFahrzeug.stanKonform}
                        onChange={(e) => setNewFahrzeug((prev) => ({ ...prev, stanKonform: e.target.value as 'JA' | 'NEIN' | 'UNBEKANNT' }))}
                      >
                        <option value="UNBEKANNT">unbekannt</option>
                        <option value="JA">ja</option>
                        <option value="NEIN">nein</option>
                      </select>
                    </td>
                    <td>
                      <input value={newFahrzeug.sondergeraet} onChange={(e) => setNewFahrzeug((prev) => ({ ...prev, sondergeraet: e.target.value }))} />
                    </td>
                    <td>
                      <input value={newFahrzeug.nutzlast} onChange={(e) => setNewFahrzeug((prev) => ({ ...prev, nutzlast: e.target.value }))} />
                    </td>
                    <td>
                      <select
                        value={newFahrzeug.status}
                        onChange={(e) => setNewFahrzeug((prev) => ({ ...prev, status: e.target.value as 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB' }))}
                      >
                        <option value="AKTIV">AKTIV</option>
                        <option value="IN_BEREITSTELLUNG">IN_BEREITSTELLUNG</option>
                        <option value="AUSSER_BETRIEB">AUSSER BETRIEB</option>
                      </select>
                    </td>
                    <td className="inline-subtable-actions">
                      <button
                        onClick={async () => {
                          await props.onCreateFahrzeug(newFahrzeug);
                          setNewFahrzeug({
                            name: '',
                            kennzeichen: '',
                            status: 'AKTIV',
                            funkrufname: '',
                            stanKonform: 'UNBEKANNT',
                            sondergeraet: '',
                            nutzlast: '',
                          });
                        }}
                        disabled={props.busy || props.isArchived}
                      >
                        Hinzufügen
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <th colSpan={4}>Helfer</th>
          </tr>
          <tr>
            <td colSpan={4}>
              <table className="inline-subtable">
                <thead>
                  <tr>
                    <th>Typ</th>
                    <th>G</th>
                    <th>Name</th>
                    <th>Anzahl</th>
                    <th>Funktion</th>
                    <th>Telefon</th>
                    <th>Erreichbarkeit</th>
                    <th>Vegetarisch</th>
                    <th>Bemerkung</th>
                    <th>Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {props.helfer.map((row) => {
                    const edit = editRows[row.id];
                    if (!edit) {
                      return null;
                    }
                    return (
                      <tr key={row.id}>
                        <td>
                          <select
                            value={edit.rolle}
                            onChange={(e) =>
                              setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, rolle: e.target.value as HelferRolle } }))
                            }
                          >
                            <option value="FUEHRER">Führer</option>
                            <option value="UNTERFUEHRER">Unterführer</option>
                            <option value="HELFER">Helfer</option>
                          </select>
                        </td>
                        <td>
                          <div className="gender-toggle-group" role="group" aria-label="Geschlecht">
                            <button
                              type="button"
                              className={`gender-toggle ${edit.geschlecht === 'MAENNLICH' ? 'active' : ''}`}
                              onClick={() =>
                                setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, geschlecht: 'MAENNLICH' } }))
                              }
                              title="Männlich"
                            >
                              <FontAwesomeIcon icon={faMars} />
                            </button>
                            <button
                              type="button"
                              className={`gender-toggle ${edit.geschlecht === 'WEIBLICH' ? 'active' : ''}`}
                              onClick={() =>
                                setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, geschlecht: 'WEIBLICH' } }))
                              }
                              title="Weiblich"
                            >
                              <FontAwesomeIcon icon={faVenus} />
                            </button>
                          </div>
                        </td>
                        <td className="helper-name-cell">
                          <TaktischesZeichenPerson organisation={props.form.organisation} rolle={edit.rolle} />
                          <input
                            value={edit.name}
                            onChange={(e) => setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, name: e.target.value } }))}
                            placeholder="optional"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={1}
                            value={edit.anzahl}
                            onChange={(e) =>
                              setEditRows((prev) => ({
                                ...prev,
                                [row.id]: { ...edit, anzahl: Math.max(1, Math.round(Number(e.target.value) || 1)) },
                              }))
                            }
                          />
                        </td>
                        <td><input value={edit.funktion} onChange={(e) => setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, funktion: e.target.value } }))} /></td>
                        <td><input value={edit.telefon} onChange={(e) => setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, telefon: e.target.value } }))} /></td>
                        <td><input value={edit.erreichbarkeit} onChange={(e) => setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, erreichbarkeit: e.target.value } }))} /></td>
                        <td>
                          <input
                            type="checkbox"
                            checked={edit.vegetarisch}
                            onChange={(e) => setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, vegetarisch: e.target.checked } }))}
                          />
                        </td>
                        <td><input value={edit.bemerkung} onChange={(e) => setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, bemerkung: e.target.value } }))} /></td>
                        <td className="inline-subtable-actions">
                          <button
                            onClick={() =>
                              void props.onUpdateHelfer({
                                helferId: row.id,
                                ...edit,
                              })
                            }
                            disabled={props.busy || props.isArchived}
                          >
                            Speichern
                          </button>
                          <button onClick={() => void props.onDeleteHelfer(row.id)} disabled={props.busy || props.isArchived}>
                            Löschen
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {Object.entries(autoRows).map(([autoKey, row]) => (
                    <tr key={autoKey}>
                      <td>
                        <select
                          value={row.rolle}
                          onChange={(e) =>
                            setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, rolle: e.target.value as HelferRolle } }))
                          }
                        >
                          <option value="FUEHRER">Führer</option>
                          <option value="UNTERFUEHRER">Unterführer</option>
                          <option value="HELFER">Helfer</option>
                        </select>
                      </td>
                      <td>
                        <div className="gender-toggle-group" role="group" aria-label="Geschlecht">
                          <button
                            type="button"
                            className={`gender-toggle ${row.geschlecht === 'MAENNLICH' ? 'active' : ''}`}
                            onClick={() => setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, geschlecht: 'MAENNLICH' } }))}
                            title="Männlich"
                          >
                            <FontAwesomeIcon icon={faMars} />
                          </button>
                          <button
                            type="button"
                            className={`gender-toggle ${row.geschlecht === 'WEIBLICH' ? 'active' : ''}`}
                            onClick={() => setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, geschlecht: 'WEIBLICH' } }))}
                            title="Weiblich"
                          >
                            <FontAwesomeIcon icon={faVenus} />
                          </button>
                        </div>
                      </td>
                      <td className="helper-name-cell">
                        <TaktischesZeichenPerson organisation={props.form.organisation} rolle={row.rolle} />
                        <input
                          value={row.name}
                          onChange={(e) => setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, name: e.target.value } }))}
                          placeholder="optional"
                        />
                      </td>
                      <td>
                        <input type="number" min={1} value={1} readOnly />
                      </td>
                      <td><input value={row.funktion} onChange={(e) => setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, funktion: e.target.value } }))} /></td>
                      <td><input value={row.telefon} onChange={(e) => setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, telefon: e.target.value } }))} /></td>
                      <td><input value={row.erreichbarkeit} onChange={(e) => setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, erreichbarkeit: e.target.value } }))} /></td>
                      <td>
                        <input
                          type="checkbox"
                          checked={row.vegetarisch}
                          onChange={(e) => setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, vegetarisch: e.target.checked } }))}
                        />
                      </td>
                      <td><input value={row.bemerkung} onChange={(e) => setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, bemerkung: e.target.value } }))} /></td>
                      <td className="inline-subtable-actions">
                        <button onClick={() => void props.onCreateHelfer({ ...row, anzahl: 1 })} disabled={props.busy || props.isArchived}>
                          Hinzufügen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
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
