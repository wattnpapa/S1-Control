import { useEffect, useState } from 'react';
import { TaktischesZeichenEinheit } from '@renderer/components/common/TaktischesZeichenEinheit';
import type { CreateEinheitForm } from '@renderer/types/ui';
import type { TacticalSignConfig } from '@shared/types';

type TacticalFormSlice = Pick<
  CreateEinheitForm,
  'nameImEinsatz' | 'organisation' | 'tacticalSignMode' | 'tacticalSignUnit' | 'tacticalSignTyp' | 'tacticalSignDenominator'
>;

type TacticalCatalogItem = Awaited<ReturnType<typeof window.api.listTacticalSignCatalog>>[number];

interface TacticalSignSectionProps {
  form: TacticalFormSlice;
  onChange: (next: TacticalFormSlice) => void;
}

interface TacticalSuggestion {
  confidence: number;
  matchedLabel?: string;
  config: TacticalSignConfig;
}

interface ManualEditorProps {
  form: TacticalFormSlice;
  catalog: TacticalCatalogItem[];
  search: string;
  onSearch: (value: string) => void;
  onChange: (next: TacticalFormSlice) => void;
}

/**
 * Builds tactical sign preview config.
 */
function buildTacticalConfig(form: TacticalFormSlice): TacticalSignConfig {
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
 * Loads tactical sign catalog for selected organization.
 */
function useTacticalCatalog(organisation: TacticalFormSlice['organisation'], search: string): TacticalCatalogItem[] {
  const [catalog, setCatalog] = useState<TacticalCatalogItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await window.api.listTacticalSignCatalog({ organisation, query: search.trim() || undefined });
      if (!cancelled) {
        setCatalog(list);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organisation, search]);
  return catalog;
}

/**
 * Keeps auto suggestion and derived form fields in sync.
 */
function useAutoSuggestion(form: TacticalFormSlice, onChange: TacticalSignSectionProps['onChange']): TacticalSuggestion | null {
  const [suggestion, setSuggestion] = useState<TacticalSuggestion | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (form.tacticalSignMode !== 'AUTO') {
      setSuggestion(null);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      const result = await window.api.inferTacticalSign({
        organisation: form.organisation,
        nameImEinsatz: form.nameImEinsatz,
      });
      if (!cancelled) {
        setSuggestion(result);
        onChange({
          ...form,
          tacticalSignUnit: result.config.unit ?? '',
          tacticalSignTyp: result.config.typ ?? 'none',
          tacticalSignDenominator: result.config.denominator ?? '',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.nameImEinsatz, form.organisation, form.tacticalSignMode]);
  return suggestion;
}

/**
 * Renders mode selector and status text.
 */
function TacticalModeSelector({
  form,
  suggestion,
  onChange,
}: {
  form: TacticalFormSlice;
  suggestion: TacticalSuggestion | null;
  onChange: TacticalSignSectionProps['onChange'];
}): JSX.Element {
  const suggestionText =
    form.tacticalSignMode === 'AUTO'
      ? `Vorschlag: ${suggestion?.matchedLabel ?? 'kein Treffer'} (${Math.round((suggestion?.confidence ?? 0) * 100)}%)`
      : 'Manueller Modus aktiv';
  return (
    <tr>
      <th>Taktisches Zeichen</th>
      <td colSpan={3}>
        <div className="tactical-editor-grid">
          <label className="inline-checkbox">
            <input type="radio" checked={form.tacticalSignMode === 'AUTO'} onChange={() => onChange({ ...form, tacticalSignMode: 'AUTO' })} />
            Auto
          </label>
          <label className="inline-checkbox">
            <input
              type="radio"
              checked={form.tacticalSignMode === 'MANUELL'}
              onChange={() => onChange({ ...form, tacticalSignMode: 'MANUELL' })}
            />
            Manuell
          </label>
          <div className="tactical-editor-meta">{suggestionText}</div>
        </div>
      </td>
    </tr>
  );
}

/**
 * Renders manual tactical-sign controls.
 */
function ManualTacticalEditor({ form, catalog, search, onSearch, onChange }: ManualEditorProps): JSX.Element {
  return (
    <tr>
      <th>Manuell wählen</th>
      <td colSpan={3}>
        <div className="tactical-editor-grid">
          <input placeholder="Suchen..." value={search} onChange={(event) => onSearch(event.target.value)} />
          <select
            value={`${form.tacticalSignUnit}|${form.tacticalSignTyp}|${form.tacticalSignDenominator}`}
            onChange={(event) => {
              const [unit, typ, denominator] = event.target.value.split('|');
              onChange({
                ...form,
                tacticalSignUnit: unit ?? '',
                tacticalSignTyp: (typ as NonNullable<TacticalSignConfig['typ']>) ?? 'none',
                tacticalSignDenominator: denominator ?? '',
              });
            }}
          >
            <option value="|none|">-</option>
            {catalog.map((item) => (
              <option key={item.key} value={`${item.unit}|${item.typ}|${item.denominator ?? ''}`}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            placeholder="Unit"
            value={form.tacticalSignUnit}
            onChange={(event) => onChange({ ...form, tacticalSignUnit: event.target.value })}
          />
          <select
            value={form.tacticalSignTyp}
            onChange={(event) => onChange({ ...form, tacticalSignTyp: event.target.value as NonNullable<TacticalSignConfig['typ']> })}
          >
            <option value="none">Keine</option>
            <option value="platoon">Zug</option>
            <option value="group">Gruppe</option>
            <option value="squad">Trupp</option>
            <option value="zugtrupp">Zugtrupp</option>
          </select>
          <input
            placeholder="Denominator"
            value={form.tacticalSignDenominator}
            onChange={(event) => onChange({ ...form, tacticalSignDenominator: event.target.value })}
          />
          <button type="button" onClick={() => onChange({ ...form, tacticalSignMode: 'AUTO' })}>
            Zurück auf Auto
          </button>
        </div>
      </td>
    </tr>
  );
}

/**
 * Renders tactical sign preview.
 */
function TacticalPreview({ form }: { form: TacticalFormSlice }): JSX.Element {
  const previewConfig = buildTacticalConfig(form);
  return (
    <tr>
      <th>Vorschau</th>
      <td colSpan={3}>
        <div className="tactical-sign-preview-row">
          <div className="tactical-sign-preview-box">
            <TaktischesZeichenEinheit organisation={form.organisation} tacticalSignConfigJson={JSON.stringify(previewConfig)} />
          </div>
        </div>
      </td>
    </tr>
  );
}

/**
 * Handles Tactical Sign Section.
 */
export function TacticalSignSection(props: TacticalSignSectionProps): JSX.Element {
  const [search, setSearch] = useState('');
  const catalog = useTacticalCatalog(props.form.organisation, search);
  const suggestion = useAutoSuggestion(props.form, props.onChange);
  return (
    <>
      <TacticalModeSelector form={props.form} suggestion={suggestion} onChange={props.onChange} />
      {props.form.tacticalSignMode === 'MANUELL' ? (
        <ManualTacticalEditor
          form={props.form}
          catalog={catalog}
          search={search}
          onSearch={setSearch}
          onChange={props.onChange}
        />
      ) : null}
      <TacticalPreview form={props.form} />
    </>
  );
}
