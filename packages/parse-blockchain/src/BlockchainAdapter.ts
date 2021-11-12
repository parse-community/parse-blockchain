export default interface BlockchainAdapter {
  send(
    parseObjectFullJSON: Record<string, unknown>
  ): Promise<Record<string, unknown>>;

  get(className: string, objectId: string): Promise<Record<string, unknown>>;
}
