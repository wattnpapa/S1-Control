import { useAppViewModel } from '@renderer/app/useAppViewModel';
import { AppEntryView } from '@renderer/components/views/AppEntryView';
import { AppWorkspaceShell } from '@renderer/components/views/AppWorkspaceShell';

/**
 * Renders the app root and switches between entry/workspace.
 */
export function App() {
  const viewModel = useAppViewModel();
  if (!viewModel.showWorkspace || !viewModel.workspaceProps) {
    return <AppEntryView {...viewModel.entryProps} />;
  }
  return <AppWorkspaceShell {...viewModel.workspaceProps} />;
}
