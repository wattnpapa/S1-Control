import { WorkspaceViewBody } from './workspace/WorkspaceSections';
import type { WorkspaceContentProps } from './workspace/WorkspaceContent.types';

/**
 * Renders the active workspace view inside the main content area.
 */
export function WorkspaceContent(props: WorkspaceContentProps): JSX.Element {
  return (
    <section className="main-view">
      <WorkspaceViewBody {...props} />
    </section>
  );
}

export type { WorkspaceContentProps };
