import { AuditClient } from './auditClient.js';
import { assertFabricSamples } from './paths.js';

assertFabricSamples();

const client = new AuditClient();
const now = Date.now();
const result = await client.recordAudit({
  auditId: process.env.AUDIT_ID ?? `audit_demo_${now}`,
  roundId: process.env.ROUND_ID ?? '1',
  clientId: process.env.CLIENT_ID ?? 'client_001',
  shardId: process.env.SHARD_ID ?? 'shard_A',
  updatePayload: `model-update-${now}`,
  prototypePayload: `prototype-${now}`,
  metadata: {
    purpose: 'single invoke smoke test',
    local_samples: 256,
    local_loss: 0.327,
    local_acc: 0.913,
  },
});

console.log(JSON.stringify(result, null, 2));
if (!result.success) {
  process.exitCode = 1;
}
