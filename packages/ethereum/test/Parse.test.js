const { assert } = require('chai');

require('chai').use(require('chai-as-promised')).should();

const Parse = artifacts.require('Parse');

contract('Parse', (accounts) => {
  let contract;

  before(async () => {
    contract = await Parse.deployed();
  });

  describe('contract deployment', () => {
    it('has an address', async () => {
      const address = contract.address;
      assert.notEqual(address, 0x0);
      assert.notEqual(address, '');
      assert.notEqual(address, null);
      assert.notEqual(address, undefined);
    });

    it('has an owner', async () => {
      const owner = await contract.owner();
      assert.equal(owner, accounts[0]);
    });
  });

  describe('createObject', () => {
    it('should create object', async () => {
      await contract.createObject(
        'someappid',
        'SomeClass',
        'someobjectid',
        JSON.stringify({ someField: 'someValue' }),
        {
          from: accounts[0],
        }
      );
    });

    it("should be restricted to the contract's owner", async () => {
      await assert.isRejected(
        contract.createObject(
          'someappid',
          'SomeClass',
          'someobjectid',
          JSON.stringify({ someField: 'someValue' }),
          {
            from: accounts[1],
          }
        ),
        /This function is restricted to the contract's owner/
      );
    });

    it('should require _appId', async () => {
      await assert.isRejected(
        contract.createObject(
          '',
          'SomeClass',
          'someobjectid',
          JSON.stringify({ someField: 'someValue' }),
          {
            from: accounts[0],
          }
        ),
        /_appId is required/
      );
    });

    it('should require _className', async () => {
      await assert.isRejected(
        contract.createObject(
          'someappid',
          '',
          'someobjectid',
          JSON.stringify({ someField: 'someValue' }),
          {
            from: accounts[0],
          }
        ),
        /_className is required/
      );
    });

    it('should require _objectId', async () => {
      await assert.isRejected(
        contract.createObject(
          'someappid',
          'SomeClass',
          '',
          JSON.stringify({ someField: 'someValue' }),
          {
            from: accounts[0],
          }
        ),
        /_objectId is required/
      );
    });

    it('should require _objectJSON', async () => {
      await assert.isRejected(
        contract.createObject('someappid', 'SomeClass', 'someobjectid', '', {
          from: accounts[0],
        }),
        /_objectJSON is required/
      );
    });

    it('should create objects for different apps ids', async () => {
      await contract.createObject(
        'someappid1',
        'SomeClass',
        'someobjectid',
        JSON.stringify({ someField: 'someValue' }),
        {
          from: accounts[0],
        }
      );
      await contract.createObject(
        'someappid2',
        'SomeClass',
        'someobjectid',
        JSON.stringify({ someField: 'someValue' }),
        {
          from: accounts[0],
        }
      );
    });

    it('should create objects for different classes', async () => {
      await contract.createObject(
        'someappid',
        'SomeClass1',
        'someobjectid',
        JSON.stringify({ someField: 'someValue' }),
        {
          from: accounts[0],
        }
      );
      await contract.createObject(
        'someappid',
        'SomeClass2',
        'someobjectid',
        JSON.stringify({ someField: 'someValue' }),
        {
          from: accounts[0],
        }
      );
    });

    it('should create objects for the name class', async () => {
      await contract.createObject(
        'someappid',
        'SomeClass',
        'someobjectid1',
        JSON.stringify({ someField: 'someValue' }),
        {
          from: accounts[0],
        }
      );
      await contract.createObject(
        'someappid',
        'SomeClass',
        'someobjectid2',
        JSON.stringify({ someField: 'someValue' }),
        {
          from: accounts[0],
        }
      );
    });

    it('should enforce unique object ids', async () => {
      await contract.createObject(
        'someappid',
        'SomeClass',
        'duplicatedobjectid',
        JSON.stringify({ someField: 'someValue' }),
        {
          from: accounts[0],
        }
      );
      await assert.isRejected(
        contract.createObject(
          'someappid',
          'SomeClass',
          'duplicatedobjectid',
          JSON.stringify({ someField: 'someValue' }),
          {
            from: accounts[0],
          }
        ),
        /_objectId must be unique/
      );
    });
  });
});
