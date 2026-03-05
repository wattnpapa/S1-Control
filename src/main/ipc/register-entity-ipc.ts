import type { EntityIpcHelpers, RegistrarCommon } from './register-support';
import { registerEntityCommandHandlers } from './register-entity-command-ipc';
import { registerEditLockHandlers } from './register-entity-lock-ipc';
import { registerEinheitHandlers } from './register-entity-einheit-ipc';
import { registerFahrzeugHandlers } from './register-entity-fahrzeug-ipc';
import { registerHelferHandlers } from './register-entity-helfer-ipc';

/**
 * Registers entity-related IPC handlers.
 */
export function registerEntityIpc(common: RegistrarCommon, helpers: EntityIpcHelpers): void {
  registerEinheitHandlers(common, helpers);
  registerFahrzeugHandlers(common, helpers);
  registerHelferHandlers(common, helpers);
  registerEntityCommandHandlers(common, helpers);
  registerEditLockHandlers(common, helpers);
}
