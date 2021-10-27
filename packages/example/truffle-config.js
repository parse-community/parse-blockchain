const path = require('path');
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  contracts_directory: path.resolve(__dirname, './node_modules/@parse/ethereum/contracts'),
  contracts_build_directory: path.resolve(__dirname, './node_modules/@parse/ethereum/build/contracts'),
  migrations_directory: path.resolve(__dirname, './node_modules/@parse/ethereum/migrations'),
  networks: {
    parseserverblockchaindev: {
      provider: () =>
        new HDWalletProvider(
          'ACCOUNT_PRIVATE_KEY', // Copy to here the private key of one of your Ganache auto-generated accounts
          'ws://127.0.0.1:8545'
        ),
      network_id: '1000000000000', // The same network id that you used on Ganache
      from: 'ACCOUNT_ADDRESS', // Copy to here the address of one of your Ganache auto-generated accounts
    },
  },
};
