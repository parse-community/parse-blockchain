import Web3 from 'web3';
import Parse from 'parse/node';
import * as ganache from '../support/ganache';
import * as truffle from '../support/truffle';
import * as parseServer from '../support/parseServer';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const contractDefinition = require('../../ethereum/build/contracts/Parse.json');
const contractABI = contractDefinition.abi;
const contractAddress =
  contractDefinition.networks['1000000000000'].address.toLowerCase();

describe('Integration tests', () => {
  let web3, contract;

  beforeAll(async () => {
    await ganache.start();
    await truffle.migrate();
    await parseServer.start();
    web3 = new Web3('ws://127.0.0.1:8545');
    web3.eth.accounts.wallet.add(
      '86ae9c6148520e120a7f01ad06346a3b455ca181e7300bcede8c290d9fbfddbb'
    );
    contract = new web3.eth.Contract(contractABI, contractAddress);
  }, 60000);

  afterAll(async () => {
    await ganache.stop();
    await parseServer.stop();
  });

  it('should send blockchain objects to ethereum', async () => {
    const someObject = new Parse.Object('SomeBlockchainClass');
    someObject.set('someField', 'someValue');
    await someObject.save();
    const someObjectFullJSON = someObject._toFullJSON();

    while (someObject.get('blockchainStatus') !== 'Sent') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      someObject.fetch();
    }

    expect(someObject.get('someField')).toBe('someValue');
    expect(someObject.get('blockchainStatus')).toBe('Sent');
    const blockchainResult = someObject.get('blockchainResult');
    expect(blockchainResult.type).toBe('Send');
    expect(blockchainResult.input).toBe(JSON.stringify(someObjectFullJSON));
    expect(blockchainResult.output.transactionHash.length).toBeGreaterThan(0);
    expect(blockchainResult.output.blockHash.length).toBeGreaterThan(0);
    expect(blockchainResult.output.from).toBe(
      '0xCE0C2Be1ce4FD3CA29Dc4f59Ceceed01591E204f'.toLowerCase()
    );
    expect(blockchainResult.output.to).toBe(contractAddress);
    expect(Object.keys(blockchainResult.output.events)).toEqual([
      'AppCreated',
      'ClassCreated',
      'ObjectCreated',
    ]);
    expect(blockchainResult.output.events.AppCreated.type).toBe('mined');
    expect(blockchainResult.output.events.AppCreated.returnValues._appId).toBe(
      'someappid'
    );
    expect(blockchainResult.output.events.ClassCreated.type).toBe('mined');
    expect(
      blockchainResult.output.events.ClassCreated.returnValues._appId
    ).toBe('someappid');
    expect(
      blockchainResult.output.events.ClassCreated.returnValues._className
    ).toBe('SomeBlockchainClass');
    expect(blockchainResult.output.events.ObjectCreated.type).toBe('mined');
    expect(
      blockchainResult.output.events.ObjectCreated.returnValues._appId
    ).toBe('someappid');
    expect(
      blockchainResult.output.events.ObjectCreated.returnValues._className
    ).toBe('SomeBlockchainClass');
    expect(
      blockchainResult.output.events.ObjectCreated.returnValues._objectId
    ).toBe(someObject.id);
    expect(
      blockchainResult.output.events.ObjectCreated.returnValues._objectJSON
    ).toBe(
      JSON.stringify({
        someField: 'someValue',
        createdAt: someObject.createdAt,
      })
    );
    expect(
      await contract.methods
        .getObjectJSON('someappid', 'SomeBlockchainClass', someObject.id)
        .call()
    ).toBe(
      JSON.stringify({
        someField: 'someValue',
        createdAt: someObject.createdAt,
      })
    );
  });
});
