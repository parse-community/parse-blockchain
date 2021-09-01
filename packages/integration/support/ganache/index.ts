import path from 'path';
import { fork } from 'child_process';

let ganacheServer;

export function start(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      ganacheServer = fork(path.resolve(__dirname, './server.js'));

      ganacheServer.on('message', (message) => {
        if (message === true) {
          resolve();
        } else {
          console.log(message);
        }
      });

      ganacheServer.on('error', (error) => {
        reject(error);
      });
    } catch (e) {
      reject(e);
    }
  });
}

export function stop(): Promise<void> {
  return new Promise((resolve) => {
    if (ganacheServer) {
      ganacheServer.on('close', () => {
        resolve();
      });
      ganacheServer.kill();
    } else {
      resolve();
    }
  });
}
