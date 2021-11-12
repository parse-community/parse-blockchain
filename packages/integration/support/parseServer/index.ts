import ParseServer from 'parse-server';
import express from 'express';
import Web3 from 'web3';
import { SimpleMQAdapter, bridge, worker } from '@parse/blockchain';
import { EthereumAdapter } from '@parse/blockchain-ethereum';

let parseServer;
let expressServer;

export async function start(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    try {
      parseServer = new ParseServer({
        serverURL: 'http://localhost:1337/parse',
        appId: 'someappid',
        javascriptKey: 'somejavascriptkey',
        masterKey: 'somemasterkey',
        databaseURI: 'mongodb://localhost:27017/blockchain-integration',
        cloud: './support/parseServer/cloud/main.js',
        serverStartComplete: (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        },
      });
    } catch (e) {
      reject(e);
    }
  });

  const mqAdapter = new SimpleMQAdapter();

  const web3 = new Web3('ws://127.0.0.1:8545');
  web3.eth.accounts.wallet.add(
    '86ae9c6148520e120a7f01ad06346a3b455ca181e7300bcede8c290d9fbfddbb'
  );

  bridge.initialize(
    ['SomeBlockchainClass', 'SomeBlockchainClassWithTriggers'],
    mqAdapter
  );
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const contract = require('../../../parse-blockchain-ethereum/build/contracts/Parse.json');
  worker.initialize(
    new EthereumAdapter(
      web3,
      contract.networks['1000000000000'].address,
      '0xCE0C2Be1ce4FD3CA29Dc4f59Ceceed01591E204f'
    ),
    mqAdapter
  );

  const app = express();

  app.use('/parse', parseServer.app);

  return new Promise<void>((resolve, reject) => {
    try {
      expressServer = app.listen(1337, resolve);
    } catch (e) {
      reject(e);
    }
  });
}

export function stop(): Promise<[void, void]> {
  const parseServerPromise =
    (parseServer && parseServer.handleShutdown()) || Promise.resolve();

  const expressServerPromise =
    (expressServer &&
      new Promise<void>((resolve, reject) => {
        try {
          expressServer.close(resolve);
        } catch (e) {
          reject(e);
        }
      })) ||
    Promise.resolve();

  return Promise.all([parseServerPromise, expressServerPromise]);
}
