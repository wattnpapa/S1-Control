import type { CreateFahrzeugForm, EditFahrzeugForm, KraftOverviewItem } from '@renderer/types/ui';

type FahrzeugForm = CreateFahrzeugForm | EditFahrzeugForm;

interface FahrzeugFormFieldsProps<TForm extends FahrzeugForm> {
  form: TForm;
  allKraefte: KraftOverviewItem[];
  onChange: (next: TForm) => void;
  showPlaceholder?: boolean;
}

interface FahrzeugFieldSectionProps<TForm extends FahrzeugForm> {
  form: TForm;
  allKraefte: KraftOverviewItem[];
  update: <K extends keyof TForm>(key: K, value: TForm[K]) => void;
  showPlaceholder: boolean;
}

/**
 * Renders base vehicle fields.
 */
function FahrzeugBaseFields<TForm extends FahrzeugForm>({
  form,
  allKraefte,
  update,
  showPlaceholder,
}: FahrzeugFieldSectionProps<TForm>): JSX.Element {
  return (
    <>
      <label>
        Fahrzeugname
        <input
          value={form.name}
          onChange={(event) => update('name', event.target.value as TForm['name'])}
          placeholder={showPlaceholder ? 'z.B. MTW OV Oldenburg' : undefined}
        />
      </label>
      <label>
        Kennzeichen
        <input
          value={form.kennzeichen}
          onChange={(event) => update('kennzeichen', event.target.value as TForm['kennzeichen'])}
          placeholder={showPlaceholder ? 'z.B. THW-1234' : undefined}
        />
      </label>
      <label>
        Status
        <select value={form.status} onChange={(event) => update('status', event.target.value as TForm['status'])}>
          <option value="AKTIV">AKTIV</option>
          <option value="IN_BEREITSTELLUNG">IN_BEREITSTELLUNG</option>
          <option value="AUSSER_BETRIEB">AUSSER_BETRIEB</option>
        </select>
      </label>
      <label>
        Zugeordnete Einheit
        <select
          value={form.einheitId}
          onChange={(event) => update('einheitId', event.target.value as TForm['einheitId'])}
          disabled={allKraefte.length === 0}
        >
          <option value="">Bitte wählen</option>
          {allKraefte.map((einheit) => (
            <option key={einheit.id} value={einheit.id}>
              {einheit.nameImEinsatz} ({einheit.abschnittName})
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

/**
 * Renders optional vehicle capture-sheet fields.
 */
function FahrzeugCaptureFields<TForm extends FahrzeugForm>({
  form,
  update,
  showPlaceholder,
}: Omit<FahrzeugFieldSectionProps<TForm>, 'allKraefte'>): JSX.Element {
  return (
    <>
      <h4>Erfassungsbogen (optional)</h4>
      <label>
        FuRn
        <input
          value={form.funkrufname}
          onChange={(event) => update('funkrufname', event.target.value as TForm['funkrufname'])}
          placeholder={showPlaceholder ? 'z.B. Oldenburg 18/13' : undefined}
        />
      </label>
      <label>
        Ausstattung nach STAN
        <select
          value={form.stanKonform}
          onChange={(event) => update('stanKonform', event.target.value as TForm['stanKonform'])}
        >
          <option value="UNBEKANNT">unbekannt</option>
          <option value="JA">ja</option>
          <option value="NEIN">nein</option>
        </select>
      </label>
      <label>
        Sondergerät / Änderungen
        <textarea
          rows={2}
          value={form.sondergeraet}
          onChange={(event) => update('sondergeraet', event.target.value as TForm['sondergeraet'])}
        />
      </label>
      <label>
        Nutzlast
        <input
          value={form.nutzlast}
          onChange={(event) => update('nutzlast', event.target.value as TForm['nutzlast'])}
          placeholder={showPlaceholder ? 'z.B. 5t' : undefined}
        />
      </label>
    </>
  );
}

/**
 * Renders common vehicle form fields for create/edit dialogs.
 */
export function FahrzeugFormFields<TForm extends FahrzeugForm>({
  form,
  allKraefte,
  onChange,
  showPlaceholder = false,
}: FahrzeugFormFieldsProps<TForm>): JSX.Element {
  const update = <K extends keyof TForm>(key: K, value: TForm[K]): void => {
    onChange({ ...form, [key]: value });
  };

  return (
    <>
      <FahrzeugBaseFields form={form} allKraefte={allKraefte} update={update} showPlaceholder={showPlaceholder} />
      <FahrzeugCaptureFields form={form} update={update} showPlaceholder={showPlaceholder} />
    </>
  );
}
