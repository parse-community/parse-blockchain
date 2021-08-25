import * as server from './server';

describe('Integration tests', () => {
  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  })

  it('should pass', async () => {
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('Hello world!');
  });
});
