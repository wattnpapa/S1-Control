import { buildTacticalSignConfigJson } from '@renderer/app/tactical-sign-form';
import { parseAndValidateStrength } from './types';
import type { UseEinheitActionsProps } from './types';

/**
 * Builds initial create form state for a selected section.
 */
function initialCreateEinheitForm(selectedAbschnittId: string) {
  return {
    nameImEinsatz: '',
    organisation: 'THW' as const,
    fuehrung: '0',
    unterfuehrung: '1',
    mannschaft: '8',
    status: 'AKTIV' as const,
    abschnittId: selectedAbschnittId,
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
    tacticalSignMode: 'AUTO' as const,
    tacticalSignUnit: '',
    tacticalSignTyp: 'none' as const,
    tacticalSignDenominator: '',
  };
}

/**
 * Creates callback for opening the create dialog with default values.
 */
function buildOpenCreateDialog(props: UseEinheitActionsProps) {
  return () => {
    if (!props.selectedEinsatzId || !props.selectedAbschnittId || props.isArchived) {
      return;
    }
    props.closeEditEinheitDialog();
    props.setCreateEinheitForm(initialCreateEinheitForm(props.selectedAbschnittId));
    props.setShowCreateEinheitDialog(true);
  };
}

/**
 * Creates callback for submitting the create form.
 */
function buildSubmitCreate(props: UseEinheitActionsProps) {
  return async () => {
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
    const parsed = parseAndValidateStrength(props.setError, {
      fuehrungRaw: props.createEinheitForm.fuehrung,
      unterfuehrungRaw: props.createEinheitForm.unterfuehrung,
      mannschaftRaw: props.createEinheitForm.mannschaft,
      errorMessage: 'Taktische Stärke muss aus Zahlen >= 0 bestehen.',
    });
    if (!parsed) {
      return;
    }
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
        aktuelleStaerke: parsed.gesamt,
        aktuelleStaerkeTaktisch: `${parsed.fuehrung}/${parsed.unterfuehrung}/${parsed.mannschaft}/${parsed.gesamt}`,
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
  };
}

/**
 * Provides open/create actions for Einheiten.
 */
export function useEinheitCreateActions(props: UseEinheitActionsProps) {
  const openCreateDialog = buildOpenCreateDialog(props);
  const submitCreate = buildSubmitCreate(props);

  return { openCreateDialog, submitCreate };
}
