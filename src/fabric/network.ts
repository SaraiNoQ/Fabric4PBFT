import { assertFabricSamples, getFabricPaths } from './paths.js';
import { runCommand } from './exec.js';

const action = process.argv[2] ?? 'up';
const paths = getFabricPaths();
assertFabricSamples(paths);

if (!['up', 'down'].includes(action)) {
  throw new Error('Usage: npm run fabric:network:up OR npm run fabric:network:down');
}

if (action === 'down') {
  await runCommand('./network.sh', ['down'], {
    cwd: paths.testNetworkDir,
    inheritStdio: true,
  });
} else {
  await runCommand('./network.sh', ['down'], {
    cwd: paths.testNetworkDir,
    inheritStdio: true,
    allowFailure: true,
  });
  await runCommand('./network.sh', ['up', 'createChannel', '-ca'], {
    cwd: paths.testNetworkDir,
    inheritStdio: true,
  });
}
