import { CreateAbschnittDialog } from '@renderer/components/dialogs/CreateAbschnittDialog';
import { CreateFahrzeugDialog } from '@renderer/components/dialogs/CreateFahrzeugDialog';
import { EditAbschnittDialog } from '@renderer/components/dialogs/EditAbschnittDialog';
import { MoveDialog } from '@renderer/components/dialogs/MoveDialog';
import { SplitEinheitDialog } from '@renderer/components/dialogs/SplitEinheitDialog';
import { UpdaterOverlay } from '@renderer/components/common/UpdaterUi';
import type {
  CreateAbschnittForm,
  CreateFahrzeugForm,
  EditAbschnittForm,
  KraftOverviewItem,
  MoveDialogState,
  SplitEinheitForm,
} from '@renderer/types/ui';
import type { UpdaterState } from '@shared/types';
import type { Dispatch, JSX, SetStateAction } from 'react';

interface WorkspaceDialogsProps {
  busy: boolean;
  isArchived: boolean;
  abschnitte: Awaited<ReturnType<typeof window.api.listAbschnitte>>;
  allKraefte: KraftOverviewItem[];
  updaterState: UpdaterState;
  moveDialog: MoveDialogState | null;
  moveTarget: string;
  setMoveDialog: Dispatch<SetStateAction<MoveDialogState | null>>;
  setMoveTarget: Dispatch<SetStateAction<string>>;
  showCreateAbschnittDialog: boolean;
  createAbschnittForm: CreateAbschnittForm;
  setCreateAbschnittForm: Dispatch<SetStateAction<CreateAbschnittForm>>;
  onSubmitCreateAbschnitt: () => void;
  onCloseCreateAbschnitt: () => void;
  showEditAbschnittDialog: boolean;
  editAbschnittForm: EditAbschnittForm;
  setEditAbschnittForm: Dispatch<SetStateAction<EditAbschnittForm>>;
  onSubmitEditAbschnitt: () => void;
  onCloseEditAbschnitt: () => void;
  showSplitEinheitDialog: boolean;
  splitEinheitForm: SplitEinheitForm;
  setSplitEinheitForm: Dispatch<SetStateAction<SplitEinheitForm>>;
  onSubmitSplitEinheit: () => void;
  onCloseSplitEinheit: () => void;
  showCreateFahrzeugDialog: boolean;
  createFahrzeugForm: CreateFahrzeugForm;
  setCreateFahrzeugForm: Dispatch<SetStateAction<CreateFahrzeugForm>>;
  onSubmitCreateFahrzeug: () => void;
  onCloseCreateFahrzeug: () => void;
  onMoveConfirm: () => void;
}

/**
 * Renders dialog and overlay stack for the workspace shell.
 */
export function WorkspaceDialogs(props: WorkspaceDialogsProps): JSX.Element {
  return (
    <>
      <MoveDialog
        visible={Boolean(props.moveDialog)}
        type={props.moveDialog?.type ?? 'einheit'}
        abschnitte={props.abschnitte}
        moveTarget={props.moveTarget}
        isArchived={props.isArchived}
        onChangeTarget={props.setMoveTarget}
        onConfirm={props.onMoveConfirm}
        onClose={() => {
          props.setMoveDialog(null);
          props.setMoveTarget('');
        }}
      />

      <CreateAbschnittDialog
        visible={props.showCreateAbschnittDialog}
        busy={props.busy}
        isArchived={props.isArchived}
        form={props.createAbschnittForm}
        abschnitte={props.abschnitte}
        onChange={props.setCreateAbschnittForm}
        onSubmit={props.onSubmitCreateAbschnitt}
        onClose={props.onCloseCreateAbschnitt}
      />

      <EditAbschnittDialog
        visible={props.showEditAbschnittDialog}
        busy={props.busy}
        isArchived={props.isArchived}
        form={props.editAbschnittForm}
        abschnitte={props.abschnitte}
        onChange={props.setEditAbschnittForm}
        onSubmit={props.onSubmitEditAbschnitt}
        onClose={props.onCloseEditAbschnitt}
      />

      <SplitEinheitDialog
        visible={props.showSplitEinheitDialog}
        busy={props.busy}
        isArchived={props.isArchived}
        form={props.splitEinheitForm}
        allKraefte={props.allKraefte}
        onChange={props.setSplitEinheitForm}
        onSubmit={props.onSubmitSplitEinheit}
        onClose={props.onCloseSplitEinheit}
      />

      <CreateFahrzeugDialog
        visible={props.showCreateFahrzeugDialog}
        busy={props.busy}
        isArchived={props.isArchived}
        form={props.createFahrzeugForm}
        allKraefte={props.allKraefte}
        onChange={props.setCreateFahrzeugForm}
        onSubmit={props.onSubmitCreateFahrzeug}
        onClose={props.onCloseCreateFahrzeug}
      />

      <UpdaterOverlay updaterState={props.updaterState} />
    </>
  );
}
