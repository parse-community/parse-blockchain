import * as ganache from '../support/ganache';
import * as truffle from '../support/truffle';
import * as parseServer from '../support/parseServer';

describe('Integration tests', () => {
  beforeAll(async () => {
    await ganache.start();
    await truffle.migrate();
    await parseServer.start();
  }, 60000);

  afterAll(async () => {
    await ganache.stop();
    await parseServer.stop();
  });

  it('should pass', async () => {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    console.log('Hello world!');
  });
});
