import { AuditClient } from './auditClient.js';
import { assertFabricSamples } from './paths.js';

assertFabricSamples();

const client = new AuditClient();
const mode = process.argv[2] ?? 'audit';
const value = process.argv[3] ?? process.env.AUDIT_ID;

if (!value) {
  throw new Error('Usage: npm run fabric:query -- audit <audit_id> OR npm run fabric:query -- round <round_id>');
}

if (mode === 'round') {
  console.log(await client.queryByRound(value));
} else {
  console.log(await client.queryAudit(value));
}
