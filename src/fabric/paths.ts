import path from 'node:path';
import { existsSync } from 'node:fs';

export type FabricPaths = {
  projectRoot: string;
  fabricSamplesDir: string;
  testNetworkDir: string;
  chaincodeDir: string;
  peerBinDir: string;
  fabricConfigDir: string;
  ordererCa: string;
  org1TlsCa: string;
  org2TlsCa: string;
  org1AdminMsp: string;
};

export function getProjectRoot(): string {
  return path.resolve(process.cwd());
}

export function getFabricPaths(): FabricPaths {
  const projectRoot = getProjectRoot();
  const fabricSamplesDir = path.resolve(
    process.env.FABRIC_SAMPLES_DIR ?? path.join(projectRoot, '..', 'fabric-samples'),
  );
  const testNetworkDir = path.join(fabricSamplesDir, 'test-network');

  return {
    projectRoot,
    fabricSamplesDir,
    testNetworkDir,
    chaincodeDir: path.join(projectRoot, 'chaincode', 'audit'),
    peerBinDir: path.join(fabricSamplesDir, 'bin'),
    fabricConfigDir: path.join(fabricSamplesDir, 'config'),
    ordererCa: path.join(
      testNetworkDir,
      'organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem',
    ),
    org1TlsCa: path.join(
      testNetworkDir,
      'organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt',
    ),
    org2TlsCa: path.join(
      testNetworkDir,
      'organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt',
    ),
    org1AdminMsp: path.join(
      testNetworkDir,
      'organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp',
    ),
  };
}

export function assertFabricSamples(paths = getFabricPaths()): void {
  const required = [paths.fabricSamplesDir, paths.testNetworkDir, paths.chaincodeDir];
  const missing = required.filter((p) => !existsSync(p));
  if (missing.length > 0) {
    throw new Error(
      [
        'Required path does not exist:',
        ...missing.map((p) => `  - ${p}`),
        '',
        'Set FABRIC_SAMPLES_DIR=/absolute/path/to/fabric-samples if your fabric-samples clone is not beside this repository.',
      ].join('\n'),
    );
  }
}
