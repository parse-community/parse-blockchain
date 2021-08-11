const { assert, expect } = require('chai');

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
      const result = await contract.createObject(
        'someappid',
        'SomeClass',
        'someobjectid',
        JSON.stringify({ someField: 'someValue' }),
        {
          from: accounts[0],
        }
      );
      expect(result.logs.length).equal(3);
      expect(result.logs[0].event).equal('AppCreated');
      expect(result.logs[0].type).equal('mined');
      expect(result.logs[0].args._appId).equal('someappid');
      expect(result.logs[1].event).equal('ClassCreated');
      expect(result.logs[1].type).equal('mined');
      expect(result.logs[1].args._className).equal('SomeClass');
      expect(result.logs[2].event).equal('ObjectCreated');
      expect(result.logs[2].type).equal('mined');
      expect(result.logs[2].args._objectId).equal('someobjectid');
      expect(result.logs[2].args._objectJSON).equal(
        JSON.stringify({ someField: 'someValue' })
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
      const result1 = await contract.createObject(
        'someappid1',
        'SomeClass',
        'someobjectid',
        JSON.stringify({ someField: 'someValue' }),
        {
          from: accounts[0],
        }
      );
      expect(result1.logs.length).equal(3);
      expect(result1.logs[0].event).equal('AppCreated');
      expect(result1.logs[0].type).equal('mined');
      expect(result1.logs[0].args._appId).equal('someappid1');
      expect(result1.logs[1].event).equal('ClassCreated');
      expect(result1.logs[1].type).equal('mined');
      expect(result1.logs[1].args._className).equal('SomeClass');
      expect(result1.logs[2].event).equal('ObjectCreated');
      expect(result1.logs[2].type).equal('mined');
      expect(result1.logs[2].args._objectId).equal('someobjectid');
      expect(result1.logs[2].args._objectJSON).equal(
        JSON.stringify({ someField: 'someValue' })
      );
      const result2 = await contract.createObject(
        'someappid2',
        'SomeClass',
        'someobjectid',
        JSON.stringify({ someField: 'someValue' }),
        {
          from: accounts[0],
        }
      );
      expect(result2.logs.length).equal(3);
      expect(result2.logs[0].event).equal('AppCreated');
      expect(result2.logs[0].type).equal('mined');
      expect(result2.logs[0].args._appId).equal('someappid2');
      expect(result2.logs[1].event).equal('ClassCreated');
      expect(result2.logs[1].type).equal('mined');
      expect(result1.logs[1].args._className).equal('SomeClass');
      expect(result2.logs[2].event).equal('ObjectCreated');
      expect(result2.logs[2].type).equal('mined');
      expect(result2.logs[2].args._objectId).equal('someobjectid');
      expect(result2.logs[2].args._objectJSON).equal(
        JSON.stringify({ someField: 'someValue' })
      );
    });

    it('should create objects for different classes', async () => {
      const result1 = await contract.createObject(
        'someappid',
        'SomeClass1',
        'someobjectid',
        JSON.stringify({ someField: 'someValue' }),
        {
          from: accounts[0],
        }
      );
      expect(result1.logs.length).equal(2);
      expect(result1.logs[0].event).equal('ClassCreated');
      expect(result1.logs[0].type).equal('mined');
      expect(result1.logs[0].args._className).equal('SomeClass1');
      expect(result1.logs[1].event).equal('ObjectCreated');
      expect(result1.logs[1].type).equal('mined');
      expect(result1.logs[1].args._objectId).equal('someobjectid');
      expect(result1.logs[1].args._objectJSON).equal(
        JSON.stringify({ someField: 'someValue' })
      );
      const result2 = await contract.createObject(
        'someappid',
        'SomeClass2',
        'someobjectid',
        JSON.stringify({ someField: 'someValue' }),
        {
          from: accounts[0],
        }
      );
      expect(result2.logs.length).equal(2);
      expect(result2.logs[0].event).equal('ClassCreated');
      expect(result2.logs[0].type).equal('mined');
      expect(result2.logs[0].args._className).equal('SomeClass2');
      expect(result2.logs[1].event).equal('ObjectCreated');
      expect(result2.logs[1].type).equal('mined');
      expect(result2.logs[1].args._objectId).equal('someobjectid');
      expect(result2.logs[1].args._objectJSON).equal(
        JSON.stringify({ someField: 'someValue' })
      );
    });

    it('should create objects for the name class', async () => {
      const result1 = await contract.createObject(
        'someappid',
        'SomeClass',
        'someobjectid1',
        JSON.stringify({ someField: 'someValue' }),
        {
          from: accounts[0],
        }
      );
      expect(result1.logs.length).equal(1);
      expect(result1.logs[0].event).equal('ObjectCreated');
      expect(result1.logs[0].type).equal('mined');
      expect(result1.logs[0].args._objectId).equal('someobjectid1');
      expect(result1.logs[0].args._objectJSON).equal(
        JSON.stringify({ someField: 'someValue' })
      );
      const result2 = await contract.createObject(
        'someappid',
        'SomeClass',
        'someobjectid2',
        JSON.stringify({ someField: 'someValue' }),
        {
          from: accounts[0],
        }
      );
      expect(result2.logs.length).equal(1);
      expect(result2.logs[0].event).equal('ObjectCreated');
      expect(result2.logs[0].type).equal('mined');
      expect(result2.logs[0].args._objectId).equal('someobjectid2');
      expect(result1.logs[0].args._objectJSON).equal(
        JSON.stringify({ someField: 'someValue' })
      );
    });

    it('should enforce unique object ids', async () => {
      const result = await contract.createObject(
        'someappid',
        'SomeClass',
        'duplicatedobjectid',
        JSON.stringify({ someField: 'someValue' }),
        {
          from: accounts[0],
        }
      );
      expect(result.logs.length).equal(1);
      expect(result.logs[0].event).equal('ObjectCreated');
      expect(result.logs[0].type).equal('mined');
      expect(result.logs[0].args._objectId).equal('duplicatedobjectid');
      expect(result.logs[0].args._objectJSON).equal(
        JSON.stringify({ someField: 'someValue' })
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

  describe('getObjectJSON', () => {
    it('should get an object', async () => {
      expect(
        await contract.getObjectJSON('someappid', 'SomeClass', 'someobjectid')
      ).equal(JSON.stringify({ someField: 'someValue' }));
      expect(
        await contract.getObjectJSON('someappid1', 'SomeClass', 'someobjectid')
      ).equal(JSON.stringify({ someField: 'someValue' }));
      expect(
        await contract.getObjectJSON('someappid2', 'SomeClass', 'someobjectid')
      ).equal(JSON.stringify({ someField: 'someValue' }));
      expect(
        await contract.getObjectJSON('someappid', 'SomeClass1', 'someobjectid')
      ).equal(JSON.stringify({ someField: 'someValue' }));
      expect(
        await contract.getObjectJSON('someappid', 'SomeClass2', 'someobjectid')
      ).equal(JSON.stringify({ someField: 'someValue' }));
      expect(
        await contract.getObjectJSON('someappid', 'SomeClass', 'someobjectid1')
      ).equal(JSON.stringify({ someField: 'someValue' }));
      expect(
        await contract.getObjectJSON('someappid', 'SomeClass', 'someobjectid2')
      ).equal(JSON.stringify({ someField: 'someValue' }));
      expect(
        await contract.getObjectJSON(
          'someappid',
          'SomeClass',
          'duplicatedobjectid'
        )
      ).equal(JSON.stringify({ someField: 'someValue' }));
    });

    it('should fail if the object does not exist', async () => {
      await assert.isRejected(
        contract.getObjectJSON(
          'inexistendappid',
          'InexistentClass',
          'inexistentobjectid'
        ),
        /The object does not exist/
      );
    });
  });
});
