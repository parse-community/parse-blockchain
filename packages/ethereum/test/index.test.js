const index = require('../');
const EthereumAdapter = require('../lib/EthereumAdapter').default;

describe('index', () => {
  it('should export EthereumAdapter', () => {
    assert.equal(index.EthereumAdapter, EthereumAdapter);
  });
});
