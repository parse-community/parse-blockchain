const { expect } = require('chai');

require('chai').use(require('chai-as-promised')).should();

const ParseArtifact = artifacts.require('Parse');

contract('Parse', (accounts) => {
  let contract;

  before(async () => {
    contract = await ParseArtifact.deployed();
  });

  describe('contract deployment', () => {
    it('has an address', async () => {
      const address = contract.address;
      expect(address).to.not.equal(0x0);
      expect(address).to.not.equal('');
      expect(address).to.not.equal(null);
      expect(address).to.not.equal(undefined);
    });

    it('has an owner', async () => {
      const owner = await contract.owner();
      expect(owner).to.equal(accounts[0]);
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
      expect(result.logs.length).to.equal(3);
      expect(result.logs[0].event).to.equal('AppCreated');
      expect(result.logs[0].type).to.equal('mined');
      expect(result.logs[0].args._appId).to.equal('someappid');
      expect(result.logs[1].event).to.equal('ClassCreated');
      expect(result.logs[1].type).to.equal('mined');
      expect(result.logs[1].args._appId).to.equal('someappid');
      expect(result.logs[1].args._className).to.equal('SomeClass');
      expect(result.logs[2].event).to.equal('ObjectCreated');
      expect(result.logs[2].type).to.equal('mined');
      expect(result.logs[2].args._appId).to.equal('someappid');
      expect(result.logs[2].args._className).to.equal('SomeClass');
      expect(result.logs[2].args._objectId).to.equal('someobjectid');
      expect(result.logs[2].args._objectJSON).to.equal(
        JSON.stringify({ someField: 'someValue' })
      );
    });

    it("should be restricted to the contract's owner", () => {
      return contract
        .createObject(
          'someappid',
          'SomeClass',
          'someobjectid',
          JSON.stringify({ someField: 'someValue' }),
          {
            from: accounts[1],
          }
        )
        .should.be.rejectedWith(
          /This function is restricted to the contract's owner/
        );
    });

    it('should require _appId', () => {
      return contract
        .createObject(
          '',
          'SomeClass',
          'someobjectid',
          JSON.stringify({ someField: 'someValue' }),
          {
            from: accounts[0],
          }
        )
        .should.be.rejectedWith(/_appId is required/);
    });

    it('should require _className', () => {
      return contract
        .createObject(
          'someappid',
          '',
          'someobjectid',
          JSON.stringify({ someField: 'someValue' }),
          {
            from: accounts[0],
          }
        )
        .should.be.rejectedWith(/_className is required/);
    });

    it('should require _objectId', () => {
      return contract
        .createObject(
          'someappid',
          'SomeClass',
          '',
          JSON.stringify({ someField: 'someValue' }),
          {
            from: accounts[0],
          }
        )
        .should.be.rejectedWith(/_objectId is required/);
    });

    it('should require _objectJSON', () => {
      return contract
        .createObject('someappid', 'SomeClass', 'someobjectid', '', {
          from: accounts[0],
        })
        .should.be.rejectedWith(/_objectJSON is required/);
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
      expect(result1.logs.length).to.equal(3);
      expect(result1.logs[0].event).to.equal('AppCreated');
      expect(result1.logs[0].type).to.equal('mined');
      expect(result1.logs[0].args._appId).to.equal('someappid1');
      expect(result1.logs[1].event).to.equal('ClassCreated');
      expect(result1.logs[1].type).to.equal('mined');
      expect(result1.logs[1].args._appId).to.equal('someappid1');
      expect(result1.logs[1].args._className).to.equal('SomeClass');
      expect(result1.logs[2].event).to.equal('ObjectCreated');
      expect(result1.logs[2].type).to.equal('mined');
      expect(result1.logs[2].args._appId).to.equal('someappid1');
      expect(result1.logs[2].args._className).to.equal('SomeClass');
      expect(result1.logs[2].args._objectId).to.equal('someobjectid');
      expect(result1.logs[2].args._objectJSON).to.equal(
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
      expect(result2.logs.length).to.equal(3);
      expect(result2.logs[0].event).to.equal('AppCreated');
      expect(result2.logs[0].type).to.equal('mined');
      expect(result2.logs[0].args._appId).to.equal('someappid2');
      expect(result2.logs[1].event).to.equal('ClassCreated');
      expect(result2.logs[1].type).to.equal('mined');
      expect(result2.logs[1].args._appId).to.equal('someappid2');
      expect(result1.logs[1].args._className).to.equal('SomeClass');
      expect(result2.logs[2].event).to.equal('ObjectCreated');
      expect(result2.logs[2].type).to.equal('mined');
      expect(result2.logs[2].args._appId).to.equal('someappid2');
      expect(result1.logs[2].args._className).to.equal('SomeClass');
      expect(result2.logs[2].args._objectId).to.equal('someobjectid');
      expect(result2.logs[2].args._objectJSON).to.equal(
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
      expect(result1.logs.length).to.equal(2);
      expect(result1.logs[0].event).to.equal('ClassCreated');
      expect(result1.logs[0].type).to.equal('mined');
      expect(result1.logs[0].args._appId).to.equal('someappid');
      expect(result1.logs[0].args._className).to.equal('SomeClass1');
      expect(result1.logs[1].event).to.equal('ObjectCreated');
      expect(result1.logs[1].type).to.equal('mined');
      expect(result1.logs[1].args._appId).to.equal('someappid');
      expect(result1.logs[1].args._className).to.equal('SomeClass1');
      expect(result1.logs[1].args._objectId).to.equal('someobjectid');
      expect(result1.logs[1].args._objectJSON).to.equal(
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
      expect(result2.logs.length).to.equal(2);
      expect(result2.logs[0].event).to.equal('ClassCreated');
      expect(result2.logs[0].type).to.equal('mined');
      expect(result2.logs[0].args._appId).to.equal('someappid');
      expect(result2.logs[0].args._className).to.equal('SomeClass2');
      expect(result2.logs[1].event).to.equal('ObjectCreated');
      expect(result2.logs[1].type).to.equal('mined');
      expect(result2.logs[1].args._appId).to.equal('someappid');
      expect(result2.logs[1].args._className).to.equal('SomeClass2');
      expect(result2.logs[1].args._objectId).to.equal('someobjectid');
      expect(result2.logs[1].args._objectJSON).to.equal(
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
      expect(result1.logs.length).to.equal(1);
      expect(result1.logs[0].event).to.equal('ObjectCreated');
      expect(result1.logs[0].type).to.equal('mined');
      expect(result1.logs[0].args._appId).to.equal('someappid');
      expect(result1.logs[0].args._className).to.equal('SomeClass');
      expect(result1.logs[0].args._objectId).to.equal('someobjectid1');
      expect(result1.logs[0].args._objectJSON).to.equal(
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
      expect(result2.logs.length).to.equal(1);
      expect(result2.logs[0].event).to.equal('ObjectCreated');
      expect(result2.logs[0].type).to.equal('mined');
      expect(result2.logs[0].args._appId).to.equal('someappid');
      expect(result2.logs[0].args._className).to.equal('SomeClass');
      expect(result2.logs[0].args._objectId).to.equal('someobjectid2');
      expect(result1.logs[0].args._objectJSON).to.equal(
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
      expect(result.logs.length).to.equal(1);
      expect(result.logs[0].event).to.equal('ObjectCreated');
      expect(result.logs[0].type).to.equal('mined');
      expect(result.logs[0].args._appId).to.equal('someappid');
      expect(result.logs[0].args._className).to.equal('SomeClass');
      expect(result.logs[0].args._objectId).to.equal('duplicatedobjectid');
      expect(result.logs[0].args._objectJSON).to.equal(
        JSON.stringify({ someField: 'someValue' })
      );
      await contract
        .createObject(
          'someappid',
          'SomeClass',
          'duplicatedobjectid',
          JSON.stringify({ someField: 'someValue' }),
          {
            from: accounts[0],
          }
        )
        .should.be.rejectedWith(/_objectId must be unique/);
    });
  });

  describe('getObjectJSON', () => {
    it('should get an object', async () => {
      expect(
        await contract.getObjectJSON('someappid', 'SomeClass', 'someobjectid')
      ).to.equal(JSON.stringify({ someField: 'someValue' }));
      expect(
        await contract.getObjectJSON('someappid1', 'SomeClass', 'someobjectid')
      ).to.equal(JSON.stringify({ someField: 'someValue' }));
      expect(
        await contract.getObjectJSON('someappid2', 'SomeClass', 'someobjectid')
      ).to.equal(JSON.stringify({ someField: 'someValue' }));
      expect(
        await contract.getObjectJSON('someappid', 'SomeClass1', 'someobjectid')
      ).to.equal(JSON.stringify({ someField: 'someValue' }));
      expect(
        await contract.getObjectJSON('someappid', 'SomeClass2', 'someobjectid')
      ).to.equal(JSON.stringify({ someField: 'someValue' }));
      expect(
        await contract.getObjectJSON('someappid', 'SomeClass', 'someobjectid1')
      ).to.equal(JSON.stringify({ someField: 'someValue' }));
      expect(
        await contract.getObjectJSON('someappid', 'SomeClass', 'someobjectid2')
      ).to.equal(JSON.stringify({ someField: 'someValue' }));
      expect(
        await contract.getObjectJSON(
          'someappid',
          'SomeClass',
          'duplicatedobjectid'
        )
      ).to.equal(JSON.stringify({ someField: 'someValue' }));
    });

    it('should fail if the object does not exist', () => {
      return contract
        .getObjectJSON(
          'inexistendappid',
          'InexistentClass',
          'inexistentobjectid'
        )
        .should.be.rejectedWith(/The object does not exist/);
    });
  });
});
