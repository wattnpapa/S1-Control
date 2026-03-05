import { buildTacticalSignConfigJson, parseTacticalSignConfig } from '@renderer/app/tactical-sign-form';
import { readError } from '@renderer/utils/error';
import { parseTaktischeStaerke } from '@renderer/utils/tactical';
import { parseAndValidateStrength } from './types';
import type { UseEinheitActionsProps } from './types';

/**
 * Releases edit lock and reports missing Einheit.
 */
async function handleMissingEinheit(props: UseEinheitActionsProps, einheitId: string): Promise<void> {
  if (!props.selectedEinsatzId) {
    return;
  }
  await props.releaseEinheitLock(props.selectedEinsatzId, einheitId);
  props.setError('Einheit nicht gefunden.');
}

/**
 * Maps overview item to edit form payload.
 */
function safeText(value: string | null | undefined): string {
  return value ?? '';
}

/**
 * Maps overview item to edit form payload.
 */
function toEditEinheitForm(einheit: UseEinheitActionsProps['allKraefte'][number], einheitId: string) {
  const parsed = parseTaktischeStaerke(einheit.aktuelleStaerkeTaktisch, einheit.aktuelleStaerke);
  const tactical = parseTacticalSignConfig(einheit.tacticalSignConfigJson);
  return {
    einheitId,
    nameImEinsatz: einheit.nameImEinsatz,
    organisation: einheit.organisation,
    fuehrung: String(parsed.fuehrung),
    unterfuehrung: String(parsed.unterfuehrung),
    mannschaft: String(parsed.mannschaft),
    status: einheit.status,
    grFuehrerName: safeText(einheit.grFuehrerName),
    ovName: safeText(einheit.ovName),
    ovTelefon: safeText(einheit.ovTelefon),
    ovFax: safeText(einheit.ovFax),
    rbName: safeText(einheit.rbName),
    rbTelefon: safeText(einheit.rbTelefon),
    rbFax: safeText(einheit.rbFax),
    lvName: safeText(einheit.lvName),
    lvTelefon: safeText(einheit.lvTelefon),
    lvFax: safeText(einheit.lvFax),
    bemerkung: safeText(einheit.bemerkung),
    vegetarierVorhanden: einheit.vegetarierVorhanden ?? false,
    erreichbarkeiten: safeText(einheit.erreichbarkeiten),
    ...tactical,
  };
}

/**
 * Opens edit form for existing Einheit.
 */
async function openEditDialogAsync(props: UseEinheitActionsProps, einheitId: string): Promise<void> {
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
    await handleMissingEinheit(props, einheitId);
    return;
  }
  const helfer = await window.api.listEinheitHelfer(einheitId);
  props.setEditEinheitHelfer(helfer);
  props.setEditEinheitForm(toEditEinheitForm(einheit, einheitId));
  props.setShowEditFahrzeugDialog(false);
  props.setShowEditEinheitDialog(true);
}

/**
 * Creates callback that loads and opens an Einheit in edit mode.
 */
function buildOpenEditDialog(props: UseEinheitActionsProps) {
  return (einheitId: string) => {
    void openEditDialogAsync(props, einheitId).catch((err) => props.setError(readError(err)));
  };
}

/**
 * Creates callback that persists Einheit edits.
 */
function buildSubmitEdit(props: UseEinheitActionsProps) {
  return async () => {
    if (!props.selectedEinsatzId || props.isArchived) {
      return;
    }
    if (!props.editEinheitForm.nameImEinsatz.trim()) {
      props.setError('Bitte Namen der Einheit eingeben.');
      return;
    }
    const parsed = parseAndValidateStrength(props.setError, {
      fuehrungRaw: props.editEinheitForm.fuehrung,
      unterfuehrungRaw: props.editEinheitForm.unterfuehrung,
      mannschaftRaw: props.editEinheitForm.mannschaft,
      errorMessage: 'Taktische Stärke muss aus Zahlen >= 0 bestehen.',
    });
    if (!parsed) {
      return;
    }
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
        aktuelleStaerke: parsed.gesamt,
        aktuelleStaerkeTaktisch: `${parsed.fuehrung}/${parsed.unterfuehrung}/${parsed.mannschaft}/${parsed.gesamt}`,
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
  };
}

/**
 * Provides edit/open actions for existing Einheiten.
 */
export function useEinheitEditActions(props: UseEinheitActionsProps) {
  const openEditDialog = buildOpenEditDialog(props);
  const submitEdit = buildSubmitEdit(props);

  return { openEditDialog, submitEdit };
}
