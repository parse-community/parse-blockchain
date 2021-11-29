const express = require('express');
const { default: ParseServer } = require('parse-server');
const { SimpleMQAdapter, bridge, worker } = require('@parse/blockchain');
const { EthereumAdapter } = require('@parse/blockchain-ethereum');
const Web3 = require('web3');
const config = require('./config');

const app = express();

const parseServer = new ParseServer({
  serverURL: 'http://localhost:1337/parse',
  appId: 'someappid',
  masterKey: 'somemasterkey',
  databaseURI: 'mongodb://localhost:27017/parseserverblockchaindev',
});

const mqAdapter = new SimpleMQAdapter();

const web3 = new Web3('ws://127.0.0.1:8545');
web3.eth.accounts.wallet.add(config.accountPrivateKey);

bridge.initialize(config.classNames, mqAdapter);
worker.initialize(
  new EthereumAdapter(web3, config.contractAddress, config.accountAddress),
  mqAdapter
);

app.use('/parse', parseServer.app);

app.listen(1337, () => {
  console.log('REST API running on http://localhost:1337/parse');
});
