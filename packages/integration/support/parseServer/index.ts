import ParseServer from 'parse-server';
import express from 'express';
import { bridge, worker } from '@parse/blockchain';
import { EthereumAdapter } from '@parse/ethereum';

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

  bridge.initialize(['SomeBlockchainClass']);
  // worker.initialize(new EthereumAdapter({}, '', ''));

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
