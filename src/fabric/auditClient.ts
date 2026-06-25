import { createHash, randomUUID } from 'node:crypto';
import { PeerCli } from './peerCli.js';

export type AuditRecordInput = {
  auditId?: string;
  roundId: string;
  clientId: string;
  shardId: string;
  updatePayload?: string;
  prototypePayload?: string;
  updateHash?: string;
  prototypeHash?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

export type AuditSubmitResult = {
  auditId: string;
  success: boolean;
  latencyMs: number;
  stdout: string;
  stderr: string;
};

export class AuditClient {
  constructor(private readonly peer = new PeerCli()) {}

  async recordAudit(input: AuditRecordInput): Promise<AuditSubmitResult> {
    const auditId = input.auditId ?? `audit_${Date.now()}_${randomUUID()}`;
    const updateHash = input.updateHash ?? sha256(input.updatePayload ?? `${auditId}:update`);
    const prototypeHash = input.prototypeHash ?? sha256(input.prototypePayload ?? `${auditId}:prototype`);
    const metadata = JSON.stringify(input.metadata ?? {});
    const createdAt = input.createdAt ?? Date.now().toString();

    const result = await this.peer.invoke('RecordAudit', [
      auditId,
      input.roundId,
      input.clientId,
      input.shardId,
      updateHash,
      prototypeHash,
      metadata,
      createdAt,
    ]);

    return {
      auditId,
      success: result.code === 0,
      latencyMs: result.durationMs,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    };
  }

  async queryAudit(auditId: string): Promise<string> {
    const result = await this.peer.query('QueryAudit', [auditId]);
    if (result.code !== 0) {
      throw new Error(result.stderr || result.stdout || `query failed for ${auditId}`);
    }
    return result.stdout.trim();
  }

  async queryByRound(roundId: string): Promise<string> {
    const result = await this.peer.query('QueryByRound', [roundId]);
    if (result.code !== 0) {
      throw new Error(result.stderr || result.stdout || `query failed for round ${roundId}`);
    }
    return result.stdout.trim();
  }
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
