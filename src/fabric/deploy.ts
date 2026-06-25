import { assertFabricSamples, getFabricPaths } from './paths.js';
import { runCommand } from './exec.js';

const paths = getFabricPaths();
assertFabricSamples(paths);

await runCommand('go', ['mod', 'tidy'], {
  cwd: paths.chaincodeDir,
  inheritStdio: true,
});

await runCommand(
  './network.sh',
  ['deployCC', '-ccn', 'auditcc', '-ccp', paths.chaincodeDir, '-ccl', 'go'],
  {
    cwd: paths.testNetworkDir,
    inheritStdio: true,
  },
);
