const express = require('express');
const { default: ParseServer } = require('parse-server');
const { SimpleMQAdapter, bridge, worker } = require('@parse/blockchain');
const { EthereumAdapter } = require('@parse/ethereum');
const Web3 = require('web3');

const app = express();

const parseServer = new ParseServer({
  serverURL: 'http://localhost:1337/parse',
  appId: 'someappid',
  masterKey: 'somemasterkey',
  databaseURI: 'mongodb://localhost:27017/parseserverblockchaindev',
});

const mqAdapter = new SimpleMQAdapter();

const web3 = new Web3('ws://127.0.0.1:8545');
web3.eth.accounts.wallet.add(
   'ACCOUNT_PRIVATE_KEY', // Copy to here the private key that you used to deploy the contracts
);

bridge.initialize(
  ['SomeBlockchainClass'], // Pass here the name of the classes whose objects you want to send to blockchain
  mqAdapter
);
worker.initialize(
  new EthereumAdapter(
    web3,
    'CONTRACT_ADDRESS', // Copy to here the Parse contract address that you copied after deploying it
    'ACCOUNT_ADDRESS', // Copy to here the address that you used to deploy the contracts
  ),
  mqAdapter
);

app.use('/parse', parseServer.app);

app.listen(1337, () => {
  console.log('REST API running on http://localhost:1337/parse');
});
