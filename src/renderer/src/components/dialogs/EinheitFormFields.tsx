import { ORGANISATION_OPTIONS } from '@renderer/constants/organisation';
import type { KraftOverviewItem, SplitEinheitForm } from '@renderer/types/ui';
import type { OrganisationKey, AbschnittNode } from '@shared/types';

type EinheitCoreForm = {
  nameImEinsatz: string;
  organisation: OrganisationKey;
  fuehrung: string;
  unterfuehrung: string;
  mannschaft: string;
  status: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'ABGEMELDET';
};

type EinheitCaptureForm = {
  grFuehrerName: string;
  ovName: string;
  ovTelefon: string;
  ovFax: string;
  rbName: string;
  rbTelefon: string;
  rbFax: string;
  lvName: string;
  lvTelefon: string;
  lvFax: string;
  bemerkung: string;
  erreichbarkeiten: string;
};

interface EinheitCoreFieldsProps<TForm extends EinheitCoreForm> {
  form: TForm;
  onChange: (next: TForm) => void;
  showNamePlaceholder?: boolean;
}

interface EinheitCaptureFieldsProps<TForm extends EinheitCaptureForm> {
  form: TForm;
  onChange: (next: TForm) => void;
  showPlaceholders?: boolean;
}

interface AbschnittFieldProps<TForm extends { abschnittId: string }> {
  form: TForm;
  abschnitte: AbschnittNode[];
  onChange: (next: TForm) => void;
}

interface SplitSourceFieldProps {
  form: SplitEinheitForm;
  allKraefte: KraftOverviewItem[];
  onChange: (next: SplitEinheitForm) => void;
}

/**
 * Renders core editable Einheit fields.
 */
export function EinheitCoreFields<TForm extends EinheitCoreForm>({
  form,
  onChange,
  showNamePlaceholder = false,
}: EinheitCoreFieldsProps<TForm>): JSX.Element {
  const update = <K extends keyof TForm>(key: K, value: TForm[K]): void => {
    onChange({ ...form, [key]: value });
  };
  return (
    <>
      <label>
        Name im Einsatz
        <input
          value={form.nameImEinsatz}
          onChange={(event) => update('nameImEinsatz', event.target.value as TForm['nameImEinsatz'])}
          placeholder={showNamePlaceholder ? 'z.B. TZ Oldenburg 1' : undefined}
        />
      </label>
      <label>
        Organisation
        <select
          value={form.organisation}
          onChange={(event) => update('organisation', event.target.value as TForm['organisation'])}
        >
          {ORGANISATION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Führung
        <input type="number" min={0} value={form.fuehrung} onChange={(event) => update('fuehrung', event.target.value as TForm['fuehrung'])} />
      </label>
      <label>
        Unterführung
        <input
          type="number"
          min={0}
          value={form.unterfuehrung}
          onChange={(event) => update('unterfuehrung', event.target.value as TForm['unterfuehrung'])}
        />
      </label>
      <label>
        Mannschaft
        <input
          type="number"
          min={0}
          value={form.mannschaft}
          onChange={(event) => update('mannschaft', event.target.value as TForm['mannschaft'])}
        />
      </label>
      <label>
        Status
        <select value={form.status} onChange={(event) => update('status', event.target.value as TForm['status'])}>
          <option value="AKTIV">AKTIV</option>
          <option value="IN_BEREITSTELLUNG">IN_BEREITSTELLUNG</option>
          <option value="ABGEMELDET">ABGEMELDET</option>
        </select>
      </label>
    </>
  );
}

/**
 * Renders optional capture-sheet fields for units.
 */
export function EinheitCaptureFields<TForm extends EinheitCaptureForm>({
  form,
  onChange,
  showPlaceholders = false,
}: EinheitCaptureFieldsProps<TForm>): JSX.Element {
  const update = <K extends keyof TForm>(key: K, value: TForm[K]): void => {
    onChange({ ...form, [key]: value });
  };
  return (
    <>
      <h4>Erfassungsbogen (optional)</h4>
      <label>
        GrFü
        <input
          value={form.grFuehrerName}
          onChange={(event) => update('grFuehrerName', event.target.value as TForm['grFuehrerName'])}
          placeholder={showPlaceholders ? 'z.B. Max Mustermann' : undefined}
        />
      </label>
      <label><span>OV</span><input value={form.ovName} onChange={(event) => update('ovName', event.target.value as TForm['ovName'])} /></label>
      <label><span>OV Telefon</span><input value={form.ovTelefon} onChange={(event) => update('ovTelefon', event.target.value as TForm['ovTelefon'])} /></label>
      <label><span>OV Fax</span><input value={form.ovFax} onChange={(event) => update('ovFax', event.target.value as TForm['ovFax'])} /></label>
      <label><span>RB</span><input value={form.rbName} onChange={(event) => update('rbName', event.target.value as TForm['rbName'])} /></label>
      <label><span>RB Telefon</span><input value={form.rbTelefon} onChange={(event) => update('rbTelefon', event.target.value as TForm['rbTelefon'])} /></label>
      <label><span>RB Fax</span><input value={form.rbFax} onChange={(event) => update('rbFax', event.target.value as TForm['rbFax'])} /></label>
      <label><span>LV</span><input value={form.lvName} onChange={(event) => update('lvName', event.target.value as TForm['lvName'])} /></label>
      <label><span>LV Telefon</span><input value={form.lvTelefon} onChange={(event) => update('lvTelefon', event.target.value as TForm['lvTelefon'])} /></label>
      <label><span>LV Fax</span><input value={form.lvFax} onChange={(event) => update('lvFax', event.target.value as TForm['lvFax'])} /></label>
      <label>
        Bemerkung
        <textarea rows={2} value={form.bemerkung} onChange={(event) => update('bemerkung', event.target.value as TForm['bemerkung'])} />
      </label>
      <label>
        Erreichbarkeiten
        <textarea
          rows={2}
          value={form.erreichbarkeiten}
          onChange={(event) => update('erreichbarkeiten', event.target.value as TForm['erreichbarkeiten'])}
          placeholder={showPlaceholders ? 'z.B. Gruppenführer Mobil, Meldekopf, Funkkanal' : undefined}
        />
      </label>
    </>
  );
}

/**
 * Renders the section selector field.
 */
export function AbschnittField<TForm extends { abschnittId: string }>({
  form,
  abschnitte,
  onChange,
}: AbschnittFieldProps<TForm>): JSX.Element {
  return (
    <label>
      Abschnitt
      <select value={form.abschnittId} onChange={(event) => onChange({ ...form, abschnittId: event.target.value })}>
        {abschnitte.map((abschnitt) => (
          <option key={abschnitt.id} value={abschnitt.id}>
            {abschnitt.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Renders source unit selector for split dialog.
 */
export function SplitSourceField({ form, allKraefte, onChange }: SplitSourceFieldProps): JSX.Element {
  return (
    <label>
      Quell-Einheit
      <select
        value={form.sourceEinheitId}
        onChange={(event) => onChange({ ...form, sourceEinheitId: event.target.value })}
      >
        <option value="">Bitte wählen</option>
        {allKraefte.map((einheit) => (
          <option key={einheit.id} value={einheit.id}>
            {einheit.nameImEinsatz} ({einheit.abschnittName}) [{einheit.aktuelleStaerkeTaktisch ?? einheit.aktuelleStaerke}]
          </option>
        ))}
      </select>
    </label>
  );
}
