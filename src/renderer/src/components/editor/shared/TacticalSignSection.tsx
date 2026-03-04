import { useEffect, useState } from 'react';
import { TaktischesZeichenEinheit } from '@renderer/components/common/TaktischesZeichenEinheit';
import type { CreateEinheitForm } from '@renderer/types/ui';
import type { TacticalSignConfig } from '@shared/types';

type TacticalFormSlice = Pick<
  CreateEinheitForm,
  'nameImEinsatz' | 'organisation' | 'tacticalSignMode' | 'tacticalSignUnit' | 'tacticalSignTyp' | 'tacticalSignDenominator'
>;

type TacticalCatalogItem = Awaited<
  ReturnType<typeof window.api.listTacticalSignCatalog>
>[number];

interface TacticalSignSectionProps {
  form: TacticalFormSlice;
  onChange: (next: TacticalFormSlice) => void;
}

/**
 * Handles Build Tactical Config.
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
 * Handles Tactical Sign Section.
 */
export function TacticalSignSection(props: TacticalSignSectionProps): JSX.Element {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
