import type { ActiveClientInfo, AbschnittDetails, AbschnittNode, RecordEditLockInfo, RecordEditLockType } from './types';

export type DbOpPriority = 'high' | 'normal' | 'low';

export interface DbRuntimeRequestBase<TType extends string, TPayload> {
  kind: 'db-runtime-request';
  requestId: string;
  type: TType;
  timeoutMs: number;
  priority: DbOpPriority;
  payload: TPayload;
}

export interface DbRuntimeResponseOk<TType extends string, TResult> {
  kind: 'db-runtime-response';
  requestId: string;
  type: TType;
  ok: true;
  result: TResult;
}

export interface DbRuntimeResponseError<TType extends string> {
  kind: 'db-runtime-response';
  requestId: string;
  type: TType;
  ok: false;
  error: {
    message: string;
    code?: string;
  };
}

export type DbRuntimeResponse<TType extends string, TResult> =
  | DbRuntimeResponseOk<TType, TResult>
  | DbRuntimeResponseError<TType>;

export type DbRuntimeOpType =
  | 'list-abschnitte'
  | 'list-abschnitt-details'
  | 'list-abschnitt-details-batch'
  | 'create-abschnitt'
  | 'update-abschnitt'
  | 'create-einheit'
  | 'update-einheit'
  | 'create-fahrzeug'
  | 'update-fahrzeug'
  | 'create-einheit-helfer'
  | 'update-einheit-helfer'
  | 'delete-einheit-helfer'
  | 'split-einheit'
  | 'move-einheit'
  | 'move-fahrzeug'
  | 'undo-last-command'
  | 'has-undoable-command'
  | 'presence-heartbeat'
  | 'presence-list-active'
  | 'presence-remove-self'
  | 'backup-run-once'
  | 'acquire-edit-lock'
  | 'refresh-edit-lock'
  | 'release-edit-lock'
  | 'list-edit-locks'
  | 'runtime-health';

export type DbRuntimeRequest =
  | DbRuntimeRequestBase<
      'list-abschnitte',
      {
        dbPath: string;
        einsatzId: string;
      }
    >
  | DbRuntimeRequestBase<
      'list-abschnitt-details',
      {
        dbPath: string;
        einsatzId: string;
        abschnittId: string;
      }
    >
  | DbRuntimeRequestBase<
      'list-abschnitt-details-batch',
      {
        dbPath: string;
        einsatzId: string;
      }
    >
  | DbRuntimeRequestBase<
      'create-abschnitt',
      {
        dbPath: string;
        einsatzId: string;
        name: string;
        systemTyp: AbschnittNode['systemTyp'];
        parentId?: string | null;
      }
    >
  | DbRuntimeRequestBase<
      'update-abschnitt',
      {
        dbPath: string;
        einsatzId: string;
        abschnittId: string;
        name: string;
        systemTyp: AbschnittNode['systemTyp'];
        parentId?: string | null;
      }
    >
  | DbRuntimeRequestBase<
      'create-einheit',
      {
        dbPath: string;
        input: {
          einsatzId: string;
          nameImEinsatz: string;
          organisation:
            | 'THW'
            | 'FEUERWEHR'
            | 'POLIZEI'
            | 'BUNDESWEHR'
            | 'REGIE'
            | 'DRK'
            | 'ASB'
            | 'JOHANNITER'
            | 'MALTESER'
            | 'DLRG'
            | 'BERGWACHT'
            | 'MHD'
            | 'RETTUNGSDIENST_KOMMUNAL'
            | 'SONSTIGE';
          aktuelleStaerke: number;
          aktuelleStaerkeTaktisch?: string;
          aktuellerAbschnittId: string;
          status?: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'ABGEMELDET';
          stammdatenEinheitId?: string;
          tacticalSignConfigJson?: string;
          grFuehrerName?: string;
          ovName?: string;
          ovTelefon?: string;
          ovFax?: string;
          rbName?: string;
          rbTelefon?: string;
          rbFax?: string;
          lvName?: string;
          lvTelefon?: string;
          lvFax?: string;
          bemerkung?: string;
          vegetarierVorhanden?: boolean | null;
          erreichbarkeiten?: string;
        };
      }
    >
  | DbRuntimeRequestBase<
      'update-einheit',
      {
        dbPath: string;
        input: {
          einsatzId: string;
          einheitId: string;
          nameImEinsatz: string;
          organisation:
            | 'THW'
            | 'FEUERWEHR'
            | 'POLIZEI'
            | 'BUNDESWEHR'
            | 'REGIE'
            | 'DRK'
            | 'ASB'
            | 'JOHANNITER'
            | 'MALTESER'
            | 'DLRG'
            | 'BERGWACHT'
            | 'MHD'
            | 'RETTUNGSDIENST_KOMMUNAL'
            | 'SONSTIGE';
          aktuelleStaerke: number;
          aktuelleStaerkeTaktisch?: string;
          status?: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'ABGEMELDET';
          tacticalSignConfigJson?: string;
          grFuehrerName?: string;
          ovName?: string;
          ovTelefon?: string;
          ovFax?: string;
          rbName?: string;
          rbTelefon?: string;
          rbFax?: string;
          lvName?: string;
          lvTelefon?: string;
          lvFax?: string;
          bemerkung?: string;
          vegetarierVorhanden?: boolean | null;
          erreichbarkeiten?: string;
        };
        identity: {
          clientId: string;
          computerName: string;
          userName: string;
        };
      }
    >
  | DbRuntimeRequestBase<
      'create-fahrzeug',
      {
        dbPath: string;
        input: {
          einsatzId: string;
          name: string;
          aktuelleEinsatzEinheitId: string;
          status?: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
          kennzeichen?: string;
          stammdatenFahrzeugId?: string;
          funkrufname?: string;
          stanKonform?: boolean | null;
          sondergeraet?: string;
          nutzlast?: string;
        };
      }
    >
  | DbRuntimeRequestBase<
      'update-fahrzeug',
      {
        dbPath: string;
        input: {
          einsatzId: string;
          fahrzeugId: string;
          name: string;
          aktuelleEinsatzEinheitId: string;
          status?: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
          kennzeichen?: string;
          funkrufname?: string;
          stanKonform?: boolean | null;
          sondergeraet?: string;
          nutzlast?: string;
        };
        identity: {
          clientId: string;
          computerName: string;
          userName: string;
        };
      }
    >
  | DbRuntimeRequestBase<
      'create-einheit-helfer',
      {
        dbPath: string;
        input: {
          einsatzId: string;
          einsatzEinheitId: string;
          name: string;
          rolle: 'FUEHRER' | 'UNTERFUEHRER' | 'HELFER';
          geschlecht?: 'MAENNLICH' | 'WEIBLICH';
          anzahl?: number;
          funktion?: string;
          telefon?: string;
          erreichbarkeit?: string;
          vegetarisch?: boolean;
          bemerkung?: string;
        };
        identity: {
          clientId: string;
          computerName: string;
          userName: string;
        };
      }
    >
  | DbRuntimeRequestBase<
      'update-einheit-helfer',
      {
        dbPath: string;
        input: {
          einsatzId: string;
          helferId: string;
          name: string;
          rolle: 'FUEHRER' | 'UNTERFUEHRER' | 'HELFER';
          geschlecht?: 'MAENNLICH' | 'WEIBLICH';
          anzahl?: number;
          funktion?: string;
          telefon?: string;
          erreichbarkeit?: string;
          vegetarisch?: boolean;
          bemerkung?: string;
        };
        identity: {
          clientId: string;
          computerName: string;
          userName: string;
        };
      }
    >
  | DbRuntimeRequestBase<
      'delete-einheit-helfer',
      {
        dbPath: string;
        input: {
          einsatzId: string;
          helferId: string;
        };
        identity: {
          clientId: string;
          computerName: string;
          userName: string;
        };
      }
    >
  | DbRuntimeRequestBase<
      'split-einheit',
      {
        dbPath: string;
        input: {
          einsatzId: string;
          sourceEinheitId: string;
          nameImEinsatz: string;
          organisation?:
            | 'THW'
            | 'FEUERWEHR'
            | 'POLIZEI'
            | 'BUNDESWEHR'
            | 'REGIE'
            | 'DRK'
            | 'ASB'
            | 'JOHANNITER'
            | 'MALTESER'
            | 'DLRG'
            | 'BERGWACHT'
            | 'MHD'
            | 'RETTUNGSDIENST_KOMMUNAL'
            | 'SONSTIGE';
          fuehrung: number;
          unterfuehrung: number;
          mannschaft: number;
          status?: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'ABGEMELDET';
          tacticalSignConfigJson?: string;
        };
      }
    >
  | DbRuntimeRequestBase<
      'move-einheit',
      {
        dbPath: string;
        input: {
          einsatzId: string;
          einheitId: string;
          nachAbschnittId: string;
          kommentar?: string;
        };
        user: {
          id: string;
          name: string;
          rolle: 'ADMIN' | 'S1' | 'FUE_ASS' | 'VIEWER';
        };
      }
    >
  | DbRuntimeRequestBase<
      'move-fahrzeug',
      {
        dbPath: string;
        input: {
          einsatzId: string;
          fahrzeugId: string;
          nachAbschnittId: string;
        };
        user: {
          id: string;
          name: string;
          rolle: 'ADMIN' | 'S1' | 'FUE_ASS' | 'VIEWER';
        };
      }
    >
  | DbRuntimeRequestBase<
      'undo-last-command',
      {
        dbPath: string;
        einsatzId: string;
        user: {
          id: string;
          name: string;
          rolle: 'ADMIN' | 'S1' | 'FUE_ASS' | 'VIEWER';
        };
      }
    >
  | DbRuntimeRequestBase<
      'has-undoable-command',
      {
        dbPath: string;
        einsatzId: string;
      }
    >
  | DbRuntimeRequestBase<
      'presence-heartbeat',
      {
        dbPath: string;
        clientId: string;
        computerName: string;
        ipAddress: string;
        startedAt: string;
      }
    >
  | DbRuntimeRequestBase<
      'presence-list-active',
      {
        dbPath: string;
        selfClientId: string;
      }
    >
  | DbRuntimeRequestBase<
      'presence-remove-self',
      {
        dbPath: string;
        clientId: string;
      }
    >
  | DbRuntimeRequestBase<
      'backup-run-once',
      {
        dbPath: string;
        targetPath: string;
      }
    >
  | DbRuntimeRequestBase<
      'acquire-edit-lock',
      {
        dbPath: string;
        einsatzId: string;
        entityType: RecordEditLockType;
        entityId: string;
        identity: {
          clientId: string;
          computerName: string;
          userName: string;
        };
      }
    >
  | DbRuntimeRequestBase<
      'refresh-edit-lock',
      {
        dbPath: string;
        einsatzId: string;
        entityType: RecordEditLockType;
        entityId: string;
        identity: {
          clientId: string;
          computerName: string;
          userName: string;
        };
      }
    >
  | DbRuntimeRequestBase<
      'release-edit-lock',
      {
        dbPath: string;
        einsatzId: string;
        entityType: RecordEditLockType;
        entityId: string;
        identity: {
          clientId: string;
          computerName: string;
          userName: string;
        };
      }
    >
  | DbRuntimeRequestBase<
      'list-edit-locks',
      {
        dbPath: string;
        einsatzId: string;
        selfClientId: string;
      }
    >
  | DbRuntimeRequestBase<'runtime-health', Record<string, never>>
;

export type DbRuntimeResponseUnion =
  | DbRuntimeResponse<'list-abschnitte', AbschnittNode[]>
  | DbRuntimeResponse<'list-abschnitt-details', AbschnittDetails>
  | DbRuntimeResponse<'list-abschnitt-details-batch', Record<string, AbschnittDetails>>
  | DbRuntimeResponse<'create-abschnitt', AbschnittNode>
  | DbRuntimeResponse<'update-abschnitt', { ok: true }>
  | DbRuntimeResponse<'create-einheit', { ok: true }>
  | DbRuntimeResponse<'update-einheit', { ok: true }>
  | DbRuntimeResponse<'create-fahrzeug', { ok: true }>
  | DbRuntimeResponse<'update-fahrzeug', { ok: true }>
  | DbRuntimeResponse<'create-einheit-helfer', { ok: true }>
  | DbRuntimeResponse<'update-einheit-helfer', { ok: true }>
  | DbRuntimeResponse<'delete-einheit-helfer', { ok: true }>
  | DbRuntimeResponse<'split-einheit', { ok: true }>
  | DbRuntimeResponse<'move-einheit', { ok: true }>
  | DbRuntimeResponse<'move-fahrzeug', { ok: true }>
  | DbRuntimeResponse<'undo-last-command', boolean>
  | DbRuntimeResponse<'has-undoable-command', boolean>
  | DbRuntimeResponse<'presence-heartbeat', { isMaster: boolean }>
  | DbRuntimeResponse<'presence-list-active', ActiveClientInfo[]>
  | DbRuntimeResponse<'presence-remove-self', { ok: true }>
  | DbRuntimeResponse<'backup-run-once', { ok: true }>
  | DbRuntimeResponse<
      'acquire-edit-lock',
      { acquired: true; lock: RecordEditLockInfo } | { acquired: false; lock: RecordEditLockInfo }
    >
  | DbRuntimeResponse<
      'refresh-edit-lock',
      { refreshed: true; lock: RecordEditLockInfo } | { refreshed: false; lock: RecordEditLockInfo | null }
    >
  | DbRuntimeResponse<'release-edit-lock', { ok: true }>
  | DbRuntimeResponse<'list-edit-locks', RecordEditLockInfo[]>
  | DbRuntimeResponse<
      'runtime-health',
      {
        currentDbPath: string | null;
        pid: number;
        uptimeMs: number;
      }
    >;

export interface DbRuntimeClient {
  request<TType extends DbRuntimeOpType>(
    type: TType,
    payload: Extract<DbRuntimeRequest, { type: TType }>['payload'],
    priority: DbOpPriority,
  ): Promise<Extract<DbRuntimeResponseUnion, { type: TType; ok: true }>['result']>;
}

export const DB_RUNTIME_TIMEOUT_MS: Record<DbOpPriority, number> = {
  high: 1200,
  normal: 5000,
  low: 15000,
};

export function isDbRuntimeRequest(value: unknown): value is DbRuntimeRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.kind === 'db-runtime-request' && typeof record.requestId === 'string' && typeof record.type === 'string';
}

export function isDbRuntimeResponse(value: unknown): value is DbRuntimeResponseUnion {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.kind === 'db-runtime-response' && typeof record.requestId === 'string' && typeof record.type === 'string';
}
