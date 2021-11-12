const { expect } = require('chai');
const Parse = require('parse/node');

global.Parse = Parse;

const EthereumAdapter = require('../lib/EthereumAdapter').default;

const ParseArtifact = artifacts.require('Parse');

contract('Parse', (accounts) => {
  let ethereumAdapter;

  before(async () => {
    Parse.initialize('someappid');
    const contract = await ParseArtifact.deployed();
    ethereumAdapter = new EthereumAdapter(web3, contract.address, accounts[0]);
  });

  describe('send', () => {
    it('should send Parse object to smart contract', async () => {
      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someobjectid';
      someObject.set('someField', 'someValue');
      const result = await ethereumAdapter.send(someObject._toFullJSON());
      expect(Object.keys(result.events)).to.eql([
        'AppCreated',
        'ClassCreated',
        'ObjectCreated',
      ]);
      expect(result.events.AppCreated.type).to.equal('mined');
      expect(result.events.AppCreated.returnValues._appId).to.equal(
        'someappid'
      );
      expect(result.events.ClassCreated.type).to.equal('mined');
      expect(result.events.ClassCreated.returnValues._appId).to.equal(
        'someappid'
      );
      expect(result.events.ClassCreated.returnValues._className).to.equal(
        'SomeClass'
      );
      expect(result.events.ObjectCreated.type).to.equal('mined');
      expect(result.events.ObjectCreated.returnValues._appId).to.equal(
        'someappid'
      );
      expect(result.events.ObjectCreated.returnValues._className).to.equal(
        'SomeClass'
      );
      expect(result.events.ObjectCreated.returnValues._objectId).to.equal(
        'someobjectid'
      );
      expect(result.events.ObjectCreated.returnValues._objectJSON).to.equal(
        JSON.stringify({
          someField: 'someValue',
        })
      );
    });
  });

  describe('get', () => {
    it('should get sent objects', async () => {
      const objectJSON = await ethereumAdapter.get('SomeClass', 'someobjectid');
      expect(JSON.stringify(objectJSON)).to.equal(
        JSON.stringify({
          someField: 'someValue',
        })
      );
    });
  });
});
