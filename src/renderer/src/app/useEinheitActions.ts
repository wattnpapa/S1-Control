import { buildTacticalSignConfigJson, parseTacticalSignConfig } from '@renderer/app/tactical-sign-form';
import { readError } from '@renderer/utils/error';
import { parseTaktischeStaerke } from '@renderer/utils/tactical';
import type {
  CreateEinheitForm,
  EditEinheitForm,
  FahrzeugOverviewItem,
  KraftOverviewItem,
  SplitEinheitForm,
} from '@renderer/types/ui';
import type { EinheitHelfer } from '@shared/types';
import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

type HelferInput = {
  name: string;
  rolle: 'FUEHRER' | 'UNTERFUEHRER' | 'HELFER';
  geschlecht: 'MAENNLICH' | 'WEIBLICH';
  anzahl: number;
  funktion: string;
  telefon: string;
  erreichbarkeit: string;
  vegetarisch: boolean;
  bemerkung: string;
};

type EinheitFahrzeugInput = {
  fahrzeugId?: string;
  name: string;
  kennzeichen: string;
  status: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
  funkrufname: string;
  stanKonform: 'JA' | 'NEIN' | 'UNBEKANNT';
  sondergeraet: string;
  nutzlast: string;
};

interface UseEinheitActionsProps {
  selectedEinsatzId: string;
  selectedAbschnittId: string;
  isArchived: boolean;
  allKraefte: KraftOverviewItem[];
  allFahrzeuge: FahrzeugOverviewItem[];
  createEinheitForm: CreateEinheitForm;
  editEinheitForm: EditEinheitForm;
  splitEinheitForm: SplitEinheitForm;
  editEinheitHelfer: EinheitHelfer[];
  setError: (message: string | null) => void;
  setCreateEinheitForm: Dispatch<SetStateAction<CreateEinheitForm>>;
  setEditEinheitForm: Dispatch<SetStateAction<EditEinheitForm>>;
  setSplitEinheitForm: Dispatch<SetStateAction<SplitEinheitForm>>;
  setEditEinheitHelfer: Dispatch<SetStateAction<EinheitHelfer[]>>;
  setShowCreateEinheitDialog: Dispatch<SetStateAction<boolean>>;
  setShowEditEinheitDialog: Dispatch<SetStateAction<boolean>>;
  setShowEditFahrzeugDialog: Dispatch<SetStateAction<boolean>>;
  setShowSplitEinheitDialog: Dispatch<SetStateAction<boolean>>;
  closeEditEinheitDialog: () => void;
  closeEditFahrzeugDialog: () => void;
  acquireEinheitLock: (einsatzId: string, einheitId: string) => Promise<boolean>;
  releaseEinheitLock: (einsatzId: string, einheitId: string) => Promise<boolean>;
  acquireFahrzeugLock: (einsatzId: string, fahrzeugId: string) => Promise<boolean>;
  releaseFahrzeugLock: (einsatzId: string, fahrzeugId: string) => Promise<boolean>;
  refreshAll: () => Promise<void>;
  withBusy: (fn: () => Promise<void>) => Promise<void>;
}

/**
 * Provides create/edit/split actions and inline helper/vehicle operations for Einheiten.
 */
export function useEinheitActions(props: UseEinheitActionsProps) {
  const openCreateDialog = useCallback(() => {
    if (!props.selectedEinsatzId || !props.selectedAbschnittId || props.isArchived) {
      return;
    }
    props.closeEditEinheitDialog();
    props.setCreateEinheitForm({
      nameImEinsatz: '',
      organisation: 'THW',
      fuehrung: '0',
      unterfuehrung: '1',
      mannschaft: '8',
      status: 'AKTIV',
      abschnittId: props.selectedAbschnittId,
      grFuehrerName: '',
      ovName: '',
      ovTelefon: '',
      ovFax: '',
      rbName: '',
      rbTelefon: '',
      rbFax: '',
      lvName: '',
      lvTelefon: '',
      lvFax: '',
      bemerkung: '',
      vegetarierVorhanden: false,
      erreichbarkeiten: '',
      tacticalSignMode: 'AUTO',
      tacticalSignUnit: '',
      tacticalSignTyp: 'none',
      tacticalSignDenominator: '',
    });
    props.setShowCreateEinheitDialog(true);
  }, [props]);

  const submitCreate = useCallback(async () => {
    if (!props.selectedEinsatzId || props.isArchived) {
      return;
    }
    if (!props.createEinheitForm.nameImEinsatz.trim()) {
      props.setError('Bitte Namen der Einheit eingeben.');
      return;
    }
    if (!props.createEinheitForm.abschnittId) {
      props.setError('Bitte Abschnitt auswählen.');
      return;
    }

    const fuehrung = Number(props.createEinheitForm.fuehrung);
    const unterfuehrung = Number(props.createEinheitForm.unterfuehrung);
    const mannschaft = Number(props.createEinheitForm.mannschaft);
    if ([fuehrung, unterfuehrung, mannschaft].some((value) => Number.isNaN(value) || value < 0)) {
      props.setError('Taktische Stärke muss aus Zahlen >= 0 bestehen.');
      return;
    }

    const gesamt = fuehrung + unterfuehrung + mannschaft;
    const taktisch = `${fuehrung}/${unterfuehrung}/${mannschaft}/${gesamt}`;
    const tacticalSignConfigJson = buildTacticalSignConfigJson({
      nameImEinsatz: props.createEinheitForm.nameImEinsatz.trim(),
      organisation: props.createEinheitForm.organisation,
      tacticalSignMode: props.createEinheitForm.tacticalSignMode,
      tacticalSignUnit: props.createEinheitForm.tacticalSignUnit,
      tacticalSignTyp: props.createEinheitForm.tacticalSignTyp,
      tacticalSignDenominator: props.createEinheitForm.tacticalSignDenominator,
    });

    await props.withBusy(async () => {
      await window.api.createEinheit({
        einsatzId: props.selectedEinsatzId,
        nameImEinsatz: props.createEinheitForm.nameImEinsatz.trim(),
        organisation: props.createEinheitForm.organisation,
        aktuelleStaerke: gesamt,
        aktuelleStaerkeTaktisch: taktisch,
        aktuellerAbschnittId: props.createEinheitForm.abschnittId,
        status: props.createEinheitForm.status,
        grFuehrerName: props.createEinheitForm.grFuehrerName,
        ovName: props.createEinheitForm.ovName,
        ovTelefon: props.createEinheitForm.ovTelefon,
        ovFax: props.createEinheitForm.ovFax,
        rbName: props.createEinheitForm.rbName,
        rbTelefon: props.createEinheitForm.rbTelefon,
        rbFax: props.createEinheitForm.rbFax,
        lvName: props.createEinheitForm.lvName,
        lvTelefon: props.createEinheitForm.lvTelefon,
        lvFax: props.createEinheitForm.lvFax,
        bemerkung: props.createEinheitForm.bemerkung,
        vegetarierVorhanden: false,
        erreichbarkeiten: props.createEinheitForm.erreichbarkeiten,
        tacticalSignConfigJson,
      });
      props.setShowCreateEinheitDialog(false);
      await props.refreshAll();
    });
  }, [props]);

  const openEditDialog = useCallback((einheitId: string) => {
    void (async () => {
      if (!props.selectedEinsatzId || props.isArchived) {
        return;
      }
      props.setShowCreateEinheitDialog(false);
      props.closeEditFahrzeugDialog();
      const acquired = await props.acquireEinheitLock(props.selectedEinsatzId, einheitId);
      if (!acquired) {
        return;
      }
      const einheit = props.allKraefte.find((item) => item.id === einheitId);
      if (!einheit) {
        await props.releaseEinheitLock(props.selectedEinsatzId, einheitId);
        props.setError('Einheit nicht gefunden.');
        return;
      }
      const helfer = await window.api.listEinheitHelfer(einheitId);
      props.setEditEinheitHelfer(helfer);
      const parsed = parseTaktischeStaerke(einheit.aktuelleStaerkeTaktisch, einheit.aktuelleStaerke);
      const tactical = parseTacticalSignConfig(einheit.tacticalSignConfigJson);
      props.setEditEinheitForm({
        einheitId,
        nameImEinsatz: einheit.nameImEinsatz,
        organisation: einheit.organisation,
        fuehrung: String(parsed.fuehrung),
        unterfuehrung: String(parsed.unterfuehrung),
        mannschaft: String(parsed.mannschaft),
        status: einheit.status,
        grFuehrerName: einheit.grFuehrerName ?? '',
        ovName: einheit.ovName ?? '',
        ovTelefon: einheit.ovTelefon ?? '',
        ovFax: einheit.ovFax ?? '',
        rbName: einheit.rbName ?? '',
        rbTelefon: einheit.rbTelefon ?? '',
        rbFax: einheit.rbFax ?? '',
        lvName: einheit.lvName ?? '',
        lvTelefon: einheit.lvTelefon ?? '',
        lvFax: einheit.lvFax ?? '',
        bemerkung: einheit.bemerkung ?? '',
        vegetarierVorhanden: einheit.vegetarierVorhanden ?? false,
        erreichbarkeiten: einheit.erreichbarkeiten ?? '',
        ...tactical,
      });
      props.setShowEditFahrzeugDialog(false);
      props.setShowEditEinheitDialog(true);
    })().catch((err) => props.setError(readError(err)));
  }, [props]);

  const submitEdit = useCallback(async () => {
    if (!props.selectedEinsatzId || props.isArchived) {
      return;
    }
    if (!props.editEinheitForm.nameImEinsatz.trim()) {
      props.setError('Bitte Namen der Einheit eingeben.');
      return;
    }
    const fuehrung = Number(props.editEinheitForm.fuehrung);
    const unterfuehrung = Number(props.editEinheitForm.unterfuehrung);
    const mannschaft = Number(props.editEinheitForm.mannschaft);
    if ([fuehrung, unterfuehrung, mannschaft].some((value) => Number.isNaN(value) || value < 0)) {
      props.setError('Taktische Stärke muss aus Zahlen >= 0 bestehen.');
      return;
    }

    const gesamt = fuehrung + unterfuehrung + mannschaft;
    const taktisch = `${fuehrung}/${unterfuehrung}/${mannschaft}/${gesamt}`;
    const tacticalSignConfigJson = buildTacticalSignConfigJson({
      nameImEinsatz: props.editEinheitForm.nameImEinsatz.trim(),
      organisation: props.editEinheitForm.organisation,
      tacticalSignMode: props.editEinheitForm.tacticalSignMode,
      tacticalSignUnit: props.editEinheitForm.tacticalSignUnit,
      tacticalSignTyp: props.editEinheitForm.tacticalSignTyp,
      tacticalSignDenominator: props.editEinheitForm.tacticalSignDenominator,
    });

    await props.withBusy(async () => {
      await window.api.updateEinheit({
        einsatzId: props.selectedEinsatzId,
        einheitId: props.editEinheitForm.einheitId,
        nameImEinsatz: props.editEinheitForm.nameImEinsatz.trim(),
        organisation: props.editEinheitForm.organisation,
        aktuelleStaerke: gesamt,
        aktuelleStaerkeTaktisch: taktisch,
        status: props.editEinheitForm.status,
        grFuehrerName: props.editEinheitForm.grFuehrerName,
        ovName: props.editEinheitForm.ovName,
        ovTelefon: props.editEinheitForm.ovTelefon,
        ovFax: props.editEinheitForm.ovFax,
        rbName: props.editEinheitForm.rbName,
        rbTelefon: props.editEinheitForm.rbTelefon,
        rbFax: props.editEinheitForm.rbFax,
        lvName: props.editEinheitForm.lvName,
        lvTelefon: props.editEinheitForm.lvTelefon,
        lvFax: props.editEinheitForm.lvFax,
        bemerkung: props.editEinheitForm.bemerkung,
        vegetarierVorhanden: props.editEinheitHelfer.some((helfer) => helfer.vegetarisch),
        erreichbarkeiten: props.editEinheitForm.erreichbarkeiten,
        tacticalSignConfigJson,
      });
      await props.releaseEinheitLock(props.selectedEinsatzId, props.editEinheitForm.einheitId);
      props.setShowEditEinheitDialog(false);
      props.setEditEinheitHelfer([]);
      await props.refreshAll();
    });
  }, [props]);

  const createHelfer = useCallback(async (input: HelferInput) => {
    if (!props.selectedEinsatzId || !props.editEinheitForm.einheitId || props.isArchived) {
      return;
    }
    await props.withBusy(async () => {
      await window.api.createEinheitHelfer({
        einsatzId: props.selectedEinsatzId,
        einsatzEinheitId: props.editEinheitForm.einheitId,
        name: input.name.trim(),
        rolle: input.rolle,
        geschlecht: input.geschlecht,
        anzahl: input.anzahl,
        funktion: input.funktion,
        telefon: input.telefon,
        erreichbarkeit: input.erreichbarkeit,
        vegetarisch: input.vegetarisch,
        bemerkung: input.bemerkung,
      });
      props.setEditEinheitHelfer(await window.api.listEinheitHelfer(props.editEinheitForm.einheitId));
    });
  }, [props]);

  const updateHelfer = useCallback(async (input: HelferInput & { helferId: string }) => {
    if (!props.selectedEinsatzId || props.isArchived) {
      return;
    }
    await props.withBusy(async () => {
      await window.api.updateEinheitHelfer({
        einsatzId: props.selectedEinsatzId,
        helferId: input.helferId,
        name: input.name.trim(),
        rolle: input.rolle,
        geschlecht: input.geschlecht,
        anzahl: input.anzahl,
        funktion: input.funktion,
        telefon: input.telefon,
        erreichbarkeit: input.erreichbarkeit,
        vegetarisch: input.vegetarisch,
        bemerkung: input.bemerkung,
      });
      if (props.editEinheitForm.einheitId) {
        props.setEditEinheitHelfer(await window.api.listEinheitHelfer(props.editEinheitForm.einheitId));
      }
    });
  }, [props]);

  const deleteHelfer = useCallback(async (helferId: string) => {
    if (!props.selectedEinsatzId || props.isArchived) {
      return;
    }
    await props.withBusy(async () => {
      await window.api.deleteEinheitHelfer({ einsatzId: props.selectedEinsatzId, helferId });
      if (props.editEinheitForm.einheitId) {
        props.setEditEinheitHelfer(await window.api.listEinheitHelfer(props.editEinheitForm.einheitId));
      }
    });
  }, [props]);

  const createEinheitFahrzeug = useCallback(async (input: EinheitFahrzeugInput) => {
    if (!props.selectedEinsatzId || !props.editEinheitForm.einheitId || props.isArchived) {
      return;
    }
    if (!input.name.trim()) {
      props.setError('Bitte Fahrzeugname eingeben.');
      return;
    }
    await props.withBusy(async () => {
      await window.api.createFahrzeug({
        einsatzId: props.selectedEinsatzId,
        name: input.name.trim(),
        kennzeichen: input.kennzeichen.trim() || undefined,
        aktuelleEinsatzEinheitId: props.editEinheitForm.einheitId,
        status: input.status,
        funkrufname: input.funkrufname,
        stanKonform: input.stanKonform === 'UNBEKANNT' ? null : input.stanKonform === 'JA',
        sondergeraet: input.sondergeraet,
        nutzlast: input.nutzlast,
      });
      await props.refreshAll();
    });
  }, [props]);

  const updateEinheitFahrzeug = useCallback(async (input: EinheitFahrzeugInput & { fahrzeugId: string }) => {
    if (!props.selectedEinsatzId || !props.editEinheitForm.einheitId || props.isArchived) {
      return;
    }
    if (!input.name.trim()) {
      props.setError('Bitte Fahrzeugname eingeben.');
      return;
    }
    await props.withBusy(async () => {
      const acquired = await props.acquireFahrzeugLock(props.selectedEinsatzId, input.fahrzeugId);
      if (!acquired) {
        return;
      }
      try {
        await window.api.updateFahrzeug({
          einsatzId: props.selectedEinsatzId,
          fahrzeugId: input.fahrzeugId,
          name: input.name.trim(),
          kennzeichen: input.kennzeichen.trim() || undefined,
          aktuelleEinsatzEinheitId: props.editEinheitForm.einheitId,
          status: input.status,
          funkrufname: input.funkrufname,
          stanKonform: input.stanKonform === 'UNBEKANNT' ? null : input.stanKonform === 'JA',
          sondergeraet: input.sondergeraet,
          nutzlast: input.nutzlast,
        });
        await props.refreshAll();
      } finally {
        await props.releaseFahrzeugLock(props.selectedEinsatzId, input.fahrzeugId);
      }
    });
  }, [props]);

  const openSplitDialog = useCallback((sourceEinheitId: string) => {
    const source = props.allKraefte.find((einheit) => einheit.id === sourceEinheitId);
    props.setSplitEinheitForm({
      sourceEinheitId,
      nameImEinsatz: source ? `${source.nameImEinsatz} - Teil 1` : '',
      organisation: source?.organisation ?? 'THW',
      fuehrung: '0',
      unterfuehrung: '0',
      mannschaft: '1',
      status: source?.status ?? 'AKTIV',
    });
    props.setShowSplitEinheitDialog(true);
  }, [props]);

  const submitSplit = useCallback(async () => {
    if (!props.selectedEinsatzId || props.isArchived) {
      return;
    }
    if (!props.splitEinheitForm.sourceEinheitId) {
      props.setError('Bitte Quell-Einheit wählen.');
      return;
    }
    if (!props.splitEinheitForm.nameImEinsatz.trim()) {
      props.setError('Bitte Namen für die Teileinheit eingeben.');
      return;
    }

    const fuehrung = Number(props.splitEinheitForm.fuehrung);
    const unterfuehrung = Number(props.splitEinheitForm.unterfuehrung);
    const mannschaft = Number(props.splitEinheitForm.mannschaft);
    if ([fuehrung, unterfuehrung, mannschaft].some((value) => Number.isNaN(value) || value < 0)) {
      props.setError('Split-Stärke muss aus Zahlen >= 0 bestehen.');
      return;
    }

    await props.withBusy(async () => {
      await window.api.splitEinheit({
        einsatzId: props.selectedEinsatzId,
        sourceEinheitId: props.splitEinheitForm.sourceEinheitId,
        nameImEinsatz: props.splitEinheitForm.nameImEinsatz.trim(),
        organisation: props.splitEinheitForm.organisation,
        fuehrung,
        unterfuehrung,
        mannschaft,
        status: props.splitEinheitForm.status,
      });
      props.setShowSplitEinheitDialog(false);
      await props.refreshAll();
    });
  }, [props]);

  return {
    openCreateDialog,
    submitCreate,
    openEditDialog,
    submitEdit,
    createHelfer,
    updateHelfer,
    deleteHelfer,
    createEinheitFahrzeug,
    updateEinheitFahrzeug,
    openSplitDialog,
    submitSplit,
  };
}
