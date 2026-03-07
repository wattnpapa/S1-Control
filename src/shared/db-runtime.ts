import type { AbschnittDetails, AbschnittNode } from './types';

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
  | DbRuntimeRequestBase<'runtime-health', Record<string, never>>
;

export type DbRuntimeResponseUnion =
  | DbRuntimeResponse<'list-abschnitte', AbschnittNode[]>
  | DbRuntimeResponse<'list-abschnitt-details', AbschnittDetails>
  | DbRuntimeResponse<'list-abschnitt-details-batch', Record<string, AbschnittDetails>>
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
