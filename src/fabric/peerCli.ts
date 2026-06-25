import { getFabricPaths, type FabricPaths } from './paths.js';
import { runCommand, type CommandResult } from './exec.js';

export type PeerCliOptions = {
  channel?: string;
  chaincode?: string;
  paths?: FabricPaths;
};

export class PeerCli {
  private readonly channel: string;
  private readonly chaincode: string;
  private readonly paths: FabricPaths;

  constructor(options: PeerCliOptions = {}) {
    this.channel = options.channel ?? process.env.FABRIC_CHANNEL ?? 'mychannel';
    this.chaincode = options.chaincode ?? process.env.FABRIC_CHAINCODE ?? 'auditcc';
    this.paths = options.paths ?? getFabricPaths();
  }

  async invoke(functionName: string, args: string[]): Promise<CommandResult> {
    const payload = JSON.stringify({ function: functionName, Args: args });
    return runCommand(
      'peer',
      [
        'chaincode',
        'invoke',
        '-o',
        'localhost:7050',
        '--ordererTLSHostnameOverride',
        'orderer.example.com',
        '--tls',
        '--cafile',
        this.paths.ordererCa,
        '-C',
        this.channel,
        '-n',
        this.chaincode,
        '--peerAddresses',
        'localhost:7051',
        '--tlsRootCertFiles',
        this.paths.org1TlsCa,
        '--peerAddresses',
        'localhost:9051',
        '--tlsRootCertFiles',
        this.paths.org2TlsCa,
        '-c',
        payload,
      ],
      {
        cwd: this.paths.testNetworkDir,
        env: this.buildOrg1Env(),
        allowFailure: true,
      },
    );
  }

  async query(functionName: string, args: string[]): Promise<CommandResult> {
    const payload = JSON.stringify({ function: functionName, Args: args });
    return runCommand(
      'peer',
      ['chaincode', 'query', '-C', this.channel, '-n', this.chaincode, '-c', payload],
      {
        cwd: this.paths.testNetworkDir,
        env: this.buildOrg1Env(),
        allowFailure: true,
      },
    );
  }

  private buildOrg1Env(): NodeJS.ProcessEnv {
    return {
      ...process.env,
      PATH: `${this.paths.peerBinDir}:${process.env.PATH ?? ''}`,
      FABRIC_CFG_PATH: this.paths.fabricConfigDir,
      CORE_PEER_TLS_ENABLED: 'true',
      CORE_PEER_LOCALMSPID: 'Org1MSP',
      CORE_PEER_TLS_ROOTCERT_FILE: this.paths.org1TlsCa,
      CORE_PEER_MSPCONFIGPATH: this.paths.org1AdminMsp,
      CORE_PEER_ADDRESS: 'localhost:7051',
    };
  }
}
