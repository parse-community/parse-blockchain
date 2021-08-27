import path from 'path';
import { exec } from 'child_process';

export function migrate(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      exec(
        `${path.resolve(
          __dirname,
          '../../node_modules/.bin/truffle'
        )} migrate --config ${path.resolve(
          __dirname,
          'truffle-config.js'
        )} --network integrationtest`,
        (error, stdout, stderr) => {
          if (stdout) {
            console.log(stdout);
          }
          if (stderr) {
            console.error(stderr);
          }
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        }
      );
    } catch (e) {
      reject(e);
    }
  });
}
