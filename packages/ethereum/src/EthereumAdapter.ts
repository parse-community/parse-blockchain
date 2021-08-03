import { BlockchainAdapter } from '@parse/blockchain';

export default class EthereumAdapter implements BlockchainAdapter {
  send(parseObjectFullJSON: Record<string, unknown>): void {
    throw new Error('Method not implemented.');
  }
}
