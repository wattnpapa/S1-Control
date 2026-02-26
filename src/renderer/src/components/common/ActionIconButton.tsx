import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface ActionIconButtonProps {
  label: string;
  icon: IconDefinition;
  disabled?: boolean;
  onClick: () => void;
}

export function ActionIconButton(props: ActionIconButtonProps): JSX.Element {
  return (
    <button
      className="table-icon-button"
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={props.label}
      title={props.label}
    >
      <FontAwesomeIcon icon={props.icon} />
    </button>
  );
}
