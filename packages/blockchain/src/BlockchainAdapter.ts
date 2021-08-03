export default interface BlockchainAdapter {
  send(parseObjectFullJSON: Record<string, unknown>): void;
}
