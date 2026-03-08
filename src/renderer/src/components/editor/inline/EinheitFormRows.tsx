import { TacticalSignSection } from '@renderer/components/editor/shared/TacticalSignSection';
import { ORGANISATION_OPTIONS } from '@renderer/constants/organisation';
import type { CreateEinheitForm, EditEinheitForm } from '@renderer/types/ui';
import type { OrganisationKey } from '@shared/types';

type EinheitForm = CreateEinheitForm | EditEinheitForm;

interface EinheitFormRowsProps<TForm extends EinheitForm> {
  form: TForm;
  onChange: (next: TForm) => void;
}

/**
 * Renders common identity rows for unit forms.
 */
export function EinheitIdentityRows<TForm extends EinheitForm>({ form, onChange }: EinheitFormRowsProps<TForm>) {
  return (
    <>
      <tr>
        <th>Name im Einsatz</th>
        <td colSpan={3}>
          <input value={form.nameImEinsatz} onChange={(e) => onChange({ ...form, nameImEinsatz: e.target.value })} />
        </td>
      </tr>
      <tr>
        <th>Organisation</th>
        <td>
          <select value={form.organisation} onChange={(e) => onChange({ ...form, organisation: e.target.value as OrganisationKey })}>
            {ORGANISATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </td>
        <th>Status</th>
        <td>
          <select value={form.status} onChange={(e) => onChange({ ...form, status: e.target.value as TForm['status'] })}>
            <option value="AKTIV">AKTIV</option>
            <option value="IN_BEREITSTELLUNG">IN_BEREITSTELLUNG</option>
            <option value="ABGEMELDET">ABGEMELDET</option>
          </select>
        </td>
      </tr>
    </>
  );
}

/**
 * Renders common strength rows for unit forms.
 */
export function EinheitStrengthRows<TForm extends EinheitForm>({ form, onChange }: EinheitFormRowsProps<TForm>) {
  return (
    <>
      <tr>
        <th>Führung</th>
        <td>
          <input type="number" min={0} value={form.fuehrung} onChange={(e) => onChange({ ...form, fuehrung: e.target.value })} />
        </td>
        <th>Unterführung</th>
        <td>
          <input
            type="number"
            min={0}
            value={form.unterfuehrung}
            onChange={(e) => onChange({ ...form, unterfuehrung: e.target.value })}
          />
        </td>
      </tr>
      <tr>
        <th>Mannschaft</th>
        <td>
          <input
            type="number"
            min={0}
            value={form.mannschaft}
            onChange={(e) => onChange({ ...form, mannschaft: e.target.value })}
          />
        </td>
        <th />
        <td />
      </tr>
    </>
  );
}

/**
 * Renders common tactical-sign row section for unit forms.
 */
export function EinheitTacticalRows<TForm extends EinheitForm>({ form, onChange }: EinheitFormRowsProps<TForm>) {
  return (
    <TacticalSignSection
      form={{
        nameImEinsatz: form.nameImEinsatz,
        organisation: form.organisation,
        tacticalSignMode: form.tacticalSignMode,
        tacticalSignUnit: form.tacticalSignUnit,
        tacticalSignTyp: form.tacticalSignTyp,
        tacticalSignDenominator: form.tacticalSignDenominator,
      }}
      onChange={(next) =>
        onChange({
          ...form,
          tacticalSignMode: next.tacticalSignMode,
          tacticalSignUnit: next.tacticalSignUnit,
          tacticalSignTyp: next.tacticalSignTyp,
          tacticalSignDenominator: next.tacticalSignDenominator,
        })
      }
      onStanSuggestion={(suggestion) => {
        if (!('stanSuggestedVehicles' in form)) {
          return;
        }
        const createForm = form as CreateEinheitForm;
        const nextCreate: CreateEinheitForm = {
          ...createForm,
          stanPresetLabel: suggestion ? `${suggestion.title} (${Math.round(suggestion.confidence * 100)}%)` : '',
          stanSuggestedVehicles: suggestion?.vehicles ?? [],
        };
        if (suggestion?.strength) {
          nextCreate.fuehrung = String(suggestion.strength.fuehrung);
          nextCreate.unterfuehrung = String(suggestion.strength.unterfuehrung);
          nextCreate.mannschaft = String(suggestion.strength.mannschaft);
        }
        if (suggestion?.tacticalSign && createForm.tacticalSignMode !== 'MANUELL') {
          nextCreate.tacticalSignUnit = suggestion.tacticalSign.einheit || nextCreate.tacticalSignUnit;
          nextCreate.tacticalSignTyp = suggestion.tacticalSign.typ ?? nextCreate.tacticalSignTyp;
          nextCreate.tacticalSignDenominator = suggestion.tacticalSign.verwaltungsstufe ?? '';
        }
        onChange(nextCreate as TForm);
      }}
    />
  );
}

/**
 * Shows inferred STAN preset and suggested vehicles in create mode.
 */
export function EinheitStanRows<TForm extends EinheitForm>({ form }: EinheitFormRowsProps<TForm>) {
  if (!('stanSuggestedVehicles' in form)) {
    return null;
  }
  const createForm = form as CreateEinheitForm;
  return (
    <>
      <tr>
        <th>STAN-Vorschlag</th>
        <td colSpan={3}>{createForm.stanPresetLabel || 'Kein STAN-Treffer'}</td>
      </tr>
      <tr>
        <th>STAN-Fahrzeuge</th>
        <td colSpan={3}>
          {createForm.stanSuggestedVehicles.length > 0
            ? createForm.stanSuggestedVehicles.join(', ')
            : 'Keine Fahrzeugvorschläge erkannt'}
        </td>
      </tr>
    </>
  );
}

/**
 * Renders contact/detail rows for unit forms.
 */
export function EinheitContactRows<TForm extends EinheitForm>({ form, onChange }: EinheitFormRowsProps<TForm>) {
  return (
    <>
      <tr>
        <th>GrFü</th>
        <td><input value={form.grFuehrerName} onChange={(e) => onChange({ ...form, grFuehrerName: e.target.value })} /></td>
        <th>OV</th>
        <td><input value={form.ovName} onChange={(e) => onChange({ ...form, ovName: e.target.value })} /></td>
      </tr>
      <tr>
        <th>OV Telefon</th>
        <td><input value={form.ovTelefon} onChange={(e) => onChange({ ...form, ovTelefon: e.target.value })} /></td>
        <th>OV Fax</th>
        <td><input value={form.ovFax} onChange={(e) => onChange({ ...form, ovFax: e.target.value })} /></td>
      </tr>
      <tr>
        <th>RB</th>
        <td><input value={form.rbName} onChange={(e) => onChange({ ...form, rbName: e.target.value })} /></td>
        <th>RB Telefon</th>
        <td><input value={form.rbTelefon} onChange={(e) => onChange({ ...form, rbTelefon: e.target.value })} /></td>
      </tr>
      <tr>
        <th>RB Fax</th>
        <td><input value={form.rbFax} onChange={(e) => onChange({ ...form, rbFax: e.target.value })} /></td>
        <th>LV</th>
        <td><input value={form.lvName} onChange={(e) => onChange({ ...form, lvName: e.target.value })} /></td>
      </tr>
      <tr>
        <th>LV Telefon</th>
        <td><input value={form.lvTelefon} onChange={(e) => onChange({ ...form, lvTelefon: e.target.value })} /></td>
        <th>LV Fax</th>
        <td><input value={form.lvFax} onChange={(e) => onChange({ ...form, lvFax: e.target.value })} /></td>
      </tr>
    </>
  );
}

/**
 * Renders remarks/availability rows for unit forms.
 */
export function EinheitNotesRows<TForm extends EinheitForm>({ form, onChange }: EinheitFormRowsProps<TForm>) {
  return (
    <>
      <tr>
        <th>Erreichbarkeiten</th>
        <td colSpan={3}>
          <textarea rows={2} value={form.erreichbarkeiten} onChange={(e) => onChange({ ...form, erreichbarkeiten: e.target.value })} />
        </td>
      </tr>
      <tr>
        <th>Bemerkung</th>
        <td colSpan={3}>
          <textarea rows={2} value={form.bemerkung} onChange={(e) => onChange({ ...form, bemerkung: e.target.value })} />
        </td>
      </tr>
    </>
  );
}
