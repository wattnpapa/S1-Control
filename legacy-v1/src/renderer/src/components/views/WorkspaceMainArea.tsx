import { AbschnittSidebar } from '@renderer/components/layout/AbschnittSidebar';
import { WorkspaceRail } from '@renderer/components/layout/WorkspaceRail';
import { WorkspaceContent } from '@renderer/components/views/WorkspaceContent';
import type { WorkspaceView } from '@renderer/types/ui';
import type { JSX } from 'react';
import type { WorkspaceContentProps } from './WorkspaceContent';

interface WorkspaceMainAreaProps {
  activeView: WorkspaceView;
  contentProps: WorkspaceContentProps;
  showAbschnittSidebar: boolean;
  selectedAbschnittLockedByOther: boolean;
  lockByAbschnittId: Record<string, { isSelf: boolean; computerName: string; userName: string }>;
  onSetActiveView: (value: WorkspaceView) => void;
  onSetSelectedAbschnittId: (id: string) => void;
  onEditSelectedAbschnitt: () => void;
}

/**
 * Renders workspace navigation and active view content.
 */
export function WorkspaceMainArea(props: WorkspaceMainAreaProps): JSX.Element {
  return (
    <main className={props.showAbschnittSidebar ? 'content content-with-sidebar' : 'content content-no-sidebar'}>
      <WorkspaceRail activeView={props.activeView} onSelect={props.onSetActiveView} />
      {props.showAbschnittSidebar && (
        <AbschnittSidebar
          abschnitte={props.contentProps.abschnitte}
          selectedId={props.contentProps.selectedAbschnittId}
          einsatzName={props.contentProps.selectedEinsatz?.name}
          locksByAbschnittId={props.lockByAbschnittId}
          onSelect={props.onSetSelectedAbschnittId}
          onEditSelected={props.onEditSelectedAbschnitt}
          editDisabled={
            props.contentProps.busy ||
            !props.contentProps.selectedAbschnittId ||
            props.contentProps.isArchived ||
            props.selectedAbschnittLockedByOther
          }
        />
      )}

      <WorkspaceContent {...props.contentProps} />
    </main>
  );
}
