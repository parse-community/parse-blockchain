const path = require('path');
const config = require('./config');
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  contracts_directory: path.resolve(__dirname, './node_modules/@parse/ethereum/contracts'),
  contracts_build_directory: path.resolve(__dirname, './node_modules/@parse/ethereum/build/contracts'),
  migrations_directory: path.resolve(__dirname, './node_modules/@parse/ethereum/migrations'),
  networks: {
    parseserverblockchaindev: {
      provider: () =>
        new HDWalletProvider(
          config.accountPrivateKey,
          'ws://127.0.0.1:8545'
        ),
      network_id: config.networkId,
      from: config.accountAddress,
    },
  },
};
