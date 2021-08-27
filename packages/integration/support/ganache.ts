import * as ganache from 'ganache-cli';

let ganacheServer;

export function start(): Promise<void> {
  ganacheServer = ganache.server({
    accounts: [
      {
        secretKey:
          '0x86ae9c6148520e120a7f01ad06346a3b455ca181e7300bcede8c290d9fbfddbb',
        balance: '0x100000000000000000000',
      },
      {
        secretKey:
          '0x84ca389b430c0d6a6ee0ec1c2277e4fd4bde321ead1219731d2b1a299499db8d',
        balance: '0x100000000000000000000',
      },
    ],
    secure: true,
  });
  return new Promise<void>((resolve, reject) => {
    try {
      ganacheServer.listen(8545, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

export function stop(): Promise<void> {
  if (ganacheServer) {
    return ganacheServer.close();
  }
}
