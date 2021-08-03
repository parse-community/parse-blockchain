import * as index from '../src/index';
import EthereumAdapter from '../src/EthereumAdapter';

describe('index', () => {
  it('should export EthereumAdapter', () => {
    expect(index.EthereumAdapter).toBe(EthereumAdapter);
  });
});
