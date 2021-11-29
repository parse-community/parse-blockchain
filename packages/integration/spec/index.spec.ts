import * as path from 'path';
import * as fs from 'fs';
import Web3 from 'web3';
import Parse from 'parse/node';
import * as ganache from '../support/ganache';
import * as truffle from '../support/truffle';
import * as parseServer from '../support/parseServer';
import { BlockchainStatus } from '@parse/blockchain';

let contractDefinition, contractABI, contractAddress;

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
    contractDefinition = JSON.parse(
      fs.readFileSync(
        path.resolve(
          __dirname,
          '../../parse-blockchain-ethereum/build/contracts/Parse.json'
        ),
        'utf8'
      )
    );
    contractABI = contractDefinition.abi;
    contractAddress =
      contractDefinition.networks['1000000000000'].address.toLowerCase();
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

    while (someObject.get('blockchainStatus') !== BlockchainStatus.Sent) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await someObject.fetch();
    }

    expect(someObject.get('someField')).toBe('someValue');
    expect(someObject.get('blockchainStatus')).toBe(BlockchainStatus.Sent);
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

  it('should send blockchain objects to ethereum also if their class has other triggers in place', async () => {
    const someObject = new Parse.Object('SomeBlockchainClassWithTriggers');
    someObject.set('someField', 'someValue');
    await someObject.save();
    expect(someObject.get('someOtherField')).toBe('someOtherValue');
    expect(someObject.get('someNotSavedField')).toBe('someNotSavedValue');
    const someObjectFullJSON = someObject._toFullJSON();
    delete someObjectFullJSON.someNotSavedField;

    while (someObject.get('blockchainStatus') !== BlockchainStatus.Sent) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await someObject.fetch();
    }

    expect(someObject.get('someField')).toBe('someValue');
    expect(someObject.get('someOtherField')).toBe('someOtherValue');
    expect(someObject.get('someNotSavedField')).toBe(undefined);
    expect(someObject.get('blockchainStatus')).toBe(BlockchainStatus.Sent);
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
      'ClassCreated',
      'ObjectCreated',
    ]);
    expect(blockchainResult.output.events.ClassCreated.type).toBe('mined');
    expect(
      blockchainResult.output.events.ClassCreated.returnValues._appId
    ).toBe('someappid');
    expect(
      blockchainResult.output.events.ClassCreated.returnValues._className
    ).toBe('SomeBlockchainClassWithTriggers');
    expect(blockchainResult.output.events.ObjectCreated.type).toBe('mined');
    expect(
      blockchainResult.output.events.ObjectCreated.returnValues._appId
    ).toBe('someappid');
    expect(
      blockchainResult.output.events.ObjectCreated.returnValues._className
    ).toBe('SomeBlockchainClassWithTriggers');
    expect(
      blockchainResult.output.events.ObjectCreated.returnValues._objectId
    ).toBe(someObject.id);
    expect(
      blockchainResult.output.events.ObjectCreated.returnValues._objectJSON
    ).toBe(
      JSON.stringify({
        someField: 'someValue',
        createdAt: someObject.createdAt,
        someOtherField: 'someOtherValue',
      })
    );
    expect(
      await contract.methods
        .getObjectJSON(
          'someappid',
          'SomeBlockchainClassWithTriggers',
          someObject.id
        )
        .call()
    ).toBe(
      JSON.stringify({
        someField: 'someValue',
        createdAt: someObject.createdAt,
        someOtherField: 'someOtherValue',
      })
    );
  });

  it('should not send regular objects to ethereum', async () => {
    const someObject = new Parse.Object('SomeRegularClass');
    someObject.set('someField', 'someValue');
    await someObject.save();

    await new Promise((resolve) => setTimeout(resolve, 3000));
    await someObject.fetch();

    expect(someObject.get('someField')).toBe('someValue');
    expect(someObject.get('blockchainStatus')).toBe(undefined);
    expect(someObject.get('blockchainResult')).toBe(undefined);
    try {
      await contract.methods
        .getObjectJSON('someappid', 'SomeRegularClass', someObject.id)
        .call();
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(/The object does not exist/);
    }
  });

  it('should not send regular objects to ethereum also if their class has other triggers in place', async () => {
    const someObject = new Parse.Object('SomeRegularClassWithTriggers');
    someObject.set('someField', 'someValue');
    await someObject.save();
    expect(someObject.get('someOtherField')).toBe('someOtherValue');
    expect(someObject.get('someNotSavedField')).toBe('someNotSavedValue');

    await new Promise((resolve) => setTimeout(resolve, 3000));
    await someObject.fetch();

    expect(someObject.get('someField')).toBe('someValue');
    expect(someObject.get('someOtherField')).toBe('someOtherValue');
    expect(someObject.get('someNotSavedField')).toBe(undefined);
    expect(someObject.get('blockchainStatus')).toBe(undefined);
    expect(someObject.get('blockchainResult')).toBe(undefined);
    try {
      await contract.methods
        .getObjectJSON(
          'someappid',
          'SomeRegularClassWithTriggers',
          someObject.id
        )
        .call();
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(/The object does not exist/);
    }
  });

  it('should not be able to create new blockchain objects with blockchainStatus or blockchainResult', async () => {
    const someObject1 = new Parse.Object('SomeBlockchainClass');
    someObject1.set('blockchainStatus', BlockchainStatus.Sending);
    try {
      await someObject1.save();
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(
        /unauthorized: cannot set blockchainStatus field/
      );
    }
    try {
      await someObject1.save(null, { useMasterKey: true });
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(
        /unauthorized: cannot set blockchainStatus field/
      );
    }
    const someObject2 = new Parse.Object('SomeBlockchainClass');
    someObject2.set('blockchainResult', {});
    try {
      await someObject2.save();
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(
        /unauthorized: cannot set blockchainResult field/
      );
    }
    try {
      await someObject2.save(null, { useMasterKey: true });
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(
        /unauthorized: cannot set blockchainResult field/
      );
    }
  });

  it('should not be able to create new regular objects with blockchainStatus or blockchainResult', async () => {
    const someObject1 = new Parse.Object('SomeRegularClass');
    someObject1.set('blockchainStatus', BlockchainStatus.Sending);
    await someObject1.save();
    await someObject1.fetch();
    expect(someObject1.get('blockchainStatus')).toBe(BlockchainStatus.Sending);
    const someObject2 = new Parse.Object('SomeRegularClass');
    someObject2.set('blockchainStatus', BlockchainStatus.Sending);
    await someObject2.save(null, { useMasterKey: true });
    await someObject2.fetch();
    expect(someObject2.get('blockchainStatus')).toBe(BlockchainStatus.Sending);
    const someObject3 = new Parse.Object('SomeRegularClass');
    someObject3.set('blockchainResult', { someField: 'someValue' });
    await someObject3.save();
    await someObject3.fetch();
    expect(someObject3.get('blockchainResult')).toEqual({
      someField: 'someValue',
    });
    const someObject4 = new Parse.Object('SomeRegularClass');
    someObject4.set('blockchainResult', { someField: 'someValue' });
    await someObject4.save(null, { useMasterKey: true });
    await someObject4.fetch();
    expect(someObject4.get('blockchainResult')).toEqual({
      someField: 'someValue',
    });
    const someObject5 = new Parse.Object('SomeRegularClassWithTriggers');
    someObject5.set('blockchainStatus', BlockchainStatus.Sending);
    await someObject5.save();
    await someObject5.fetch();
    expect(someObject5.get('blockchainStatus')).toBe(BlockchainStatus.Sending);
    const someObject6 = new Parse.Object('SomeRegularClassWithTriggers');
    someObject6.set('blockchainStatus', BlockchainStatus.Sending);
    await someObject6.save(null, { useMasterKey: true });
    await someObject6.fetch();
    expect(someObject6.get('blockchainStatus')).toBe(BlockchainStatus.Sending);
    const someObject7 = new Parse.Object('SomeRegularClassWithTriggers');
    someObject7.set('blockchainResult', { someField: 'someValue' });
    await someObject7.save();
    await someObject7.fetch();
    expect(someObject7.get('blockchainResult')).toEqual({
      someField: 'someValue',
    });
    const someObject8 = new Parse.Object('SomeRegularClassWithTriggers');
    someObject8.set('blockchainResult', { someField: 'someValue' });
    await someObject8.save(null, { useMasterKey: true });
    await someObject8.fetch();
    expect(someObject8.get('blockchainResult')).toEqual({
      someField: 'someValue',
    });
  });

  it('should not be able to change blockchain objects', async () => {
    const someObject1 = (
      await new Parse.Query('SomeBlockchainClass').find()
    )[0];
    someObject1.set('someField', 'someOtherValue');
    try {
      await someObject1.save();
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(
        /unauthorized: cannot update objects on blockchain bridge/
      );
    }
    try {
      await someObject1.save(null, { useMasterKey: true });
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(
        /unauthorized: cannot update objects on blockchain bridge/
      );
    }
    const someObject2 = (
      await new Parse.Query('SomeBlockchainClassWithTriggers').find()
    )[0];
    someObject2.set('someField', 'someOtherValue');
    try {
      await someObject2.save();
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(
        /unauthorized: cannot update objects on blockchain bridge/
      );
    }
    try {
      await someObject2.save(null, { useMasterKey: true });
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(
        /unauthorized: cannot update objects on blockchain bridge/
      );
    }
  });

  it('should be able to change regular objects', async () => {
    const someObject1 = (await new Parse.Query('SomeRegularClass').find())[0];
    someObject1.set('someField', 'someOtherValue');
    await someObject1.save();
    await someObject1.fetch();
    expect(someObject1.get('someField')).toBe('someOtherValue');
    someObject1.set('someField', 'someOtherValue2');
    await someObject1.save(null, { useMasterKey: true });
    await someObject1.fetch();
    expect(someObject1.get('someField')).toBe('someOtherValue2');
    const someObject2 = (
      await new Parse.Query('SomeRegularClassWithTriggers').find()
    )[0];
    someObject2.set('someField', 'someOtherValue');
    await someObject2.save();
    await someObject2.fetch();
    expect(someObject2.get('someField')).toBe('someOtherValue');
    someObject2.set('someField', 'someOtherValue2');
    await someObject2.save(null, { useMasterKey: true });
    await someObject2.fetch();
    expect(someObject2.get('someField')).toBe('someOtherValue2');
  });

  it('should not be able to delete blockchain objects', async () => {
    const someObject1 = (
      await new Parse.Query('SomeBlockchainClass').find()
    )[0];
    try {
      await someObject1.destroy();
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(
        /unauthorized: cannot delete objects on blockchain bridge/
      );
    }
    try {
      await someObject1.destroy({ useMasterKey: true });
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(
        /unauthorized: cannot delete objects on blockchain bridge/
      );
    }
    const someObject2 = (
      await new Parse.Query('SomeBlockchainClassWithTriggers').find()
    )[0];
    try {
      await someObject2.destroy();
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(
        /unauthorized: cannot delete objects on blockchain bridge/
      );
    }
    try {
      await someObject2.destroy({ useMasterKey: true });
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(
        /unauthorized: cannot delete objects on blockchain bridge/
      );
    }
  });

  it('should be able to delete regular objects', async () => {
    const someObject1 = (await new Parse.Query('SomeRegularClass').find())[0];
    await someObject1.destroy();
    try {
      await someObject1.fetch();
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(/Object not found/);
    }
    const someObject2 = (await new Parse.Query('SomeRegularClass').find())[0];
    await someObject2.destroy({ useMasterKey: true });
    try {
      await someObject2.fetch();
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(/Object not found/);
    }
    const someObject3 = (
      await new Parse.Query('SomeRegularClassWithTriggers').find()
    )[0];
    try {
      await someObject3.destroy();
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(/confirmDelete is not true/);
    }
    someObject3.set('confirmDelete', true);
    await someObject3.save();
    await someObject3.destroy();
    try {
      await someObject3.fetch();
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(/Object not found/);
    }
    const someObject4 = (
      await new Parse.Query('SomeRegularClassWithTriggers').find()
    )[0];
    try {
      await someObject4.destroy({ useMasterKey: true });
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(/confirmDelete is not true/);
    }
    someObject4.set('confirmDelete', true);
    await someObject4.save();
    await someObject4.destroy({ useMasterKey: true });
    try {
      await someObject4.fetch();
      throw new Error('Should throw an error');
    } catch (e) {
      expect(e.toString()).toMatch(/Object not found/);
    }
  });
});
