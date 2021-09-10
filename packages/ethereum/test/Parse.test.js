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

    it('should be restricted to the contract and app owners', async () => {
      await contract
        .createObject(
          'someappid',
          'SomeClass',
          'someotherobjectid',
          JSON.stringify({ someField: 'someValue' }),
          {
            from: accounts[1],
          }
        )
        .should.be.rejectedWith(
          /This function is restricted to the contract and app owners/
        );
      await contract
        .createObject(
          'someotherappid',
          'SomeClass',
          'someotherobjectid',
          JSON.stringify({ someField: 'someValue' }),
          {
            from: accounts[1],
          }
        )
        .should.be.rejectedWith(
          /This function is restricted to the contract and app owners/
        );
      const result1 = await contract.addAppOwner('someappid', accounts[1]);
      expect(result1.logs.length).to.equal(1);
      expect(result1.logs[0].event).to.equal('AppOwnerAdded');
      expect(result1.logs[0].type).to.equal('mined');
      expect(result1.logs[0].args._appId).to.equal('someappid');
      expect(result1.logs[0].args._owner).to.equal(accounts[1]);
      const result2 = await contract.createObject(
        'someappid',
        'SomeClass',
        'someotherobjectid',
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
      expect(result2.logs[0].args._objectId).to.equal('someotherobjectid');
      expect(result2.logs[0].args._objectJSON).to.equal(
        JSON.stringify({ someField: 'someValue' })
      );
      await contract
        .createObject(
          'someotherappid',
          'SomeClass',
          'someotherobjectid',
          JSON.stringify({ someField: 'someValue' }),
          {
            from: accounts[1],
          }
        )
        .should.be.rejectedWith(
          /This function is restricted to the contract and app owners/
        );
      const result3 = await contract.addAppOwner('someotherappid', accounts[1]);
      expect(result3.logs.length).to.equal(2);
      expect(result3.logs[0].event).to.equal('AppCreated');
      expect(result3.logs[0].type).to.equal('mined');
      expect(result3.logs[0].args._appId).to.equal('someotherappid');
      expect(result3.logs[1].event).to.equal('AppOwnerAdded');
      expect(result3.logs[1].type).to.equal('mined');
      expect(result3.logs[1].args._appId).to.equal('someotherappid');
      expect(result3.logs[1].args._owner).to.equal(accounts[1]);
      const result4 = await contract.createObject(
        'someotherappid',
        'SomeClass',
        'someotherobjectid',
        JSON.stringify({ someField: 'someValue' }),
        {
          from: accounts[0],
        }
      );
      expect(result4.logs.length).to.equal(2);
      expect(result4.logs[0].event).to.equal('ClassCreated');
      expect(result4.logs[0].type).to.equal('mined');
      expect(result4.logs[0].args._appId).to.equal('someotherappid');
      expect(result4.logs[0].args._className).to.equal('SomeClass');
      expect(result4.logs[1].event).to.equal('ObjectCreated');
      expect(result4.logs[1].type).to.equal('mined');
      expect(result4.logs[1].args._appId).to.equal('someotherappid');
      expect(result4.logs[1].args._className).to.equal('SomeClass');
      expect(result4.logs[1].args._objectId).to.equal('someotherobjectid');
      expect(result4.logs[1].args._objectJSON).to.equal(
        JSON.stringify({ someField: 'someValue' })
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

  describe('addAppOwner', () => {
    it('should add app owner to new app', async () => {
      const result = await contract.addAppOwner('somenewappid', accounts[2]);
      expect(result.logs.length).to.equal(2);
      expect(result.logs[0].event).to.equal('AppCreated');
      expect(result.logs[0].type).to.equal('mined');
      expect(result.logs[0].args._appId).to.equal('somenewappid');
      expect(result.logs[1].event).to.equal('AppOwnerAdded');
      expect(result.logs[1].type).to.equal('mined');
      expect(result.logs[1].args._appId).to.equal('somenewappid');
      expect(result.logs[1].args._owner).to.equal(accounts[2]);
    });

    it('should add app owner to existing app', async () => {
      const result = await contract.addAppOwner('somenewappid', accounts[3]);
      expect(result.logs.length).to.equal(1);
      expect(result.logs[0].event).to.equal('AppOwnerAdded');
      expect(result.logs[0].type).to.equal('mined');
      expect(result.logs[0].args._appId).to.equal('somenewappid');
      expect(result.logs[0].args._owner).to.equal(accounts[3]);
    });

    it('should be restricted to the contract and app owners', async () => {
      await contract
        .addAppOwner('somenewappid', accounts[5], { from: accounts[4] })
        .should.be.rejectedWith(
          /This function is restricted to the contract and app owners/
        );
      await contract
        .addAppOwner('someothernewappid', accounts[5], { from: accounts[4] })
        .should.be.rejectedWith(
          /This function is restricted to the contract and app owners/
        );
      const result1 = await contract.addAppOwner('somenewappid', accounts[4], {
        from: accounts[3],
      });
      expect(result1.logs.length).to.equal(1);
      expect(result1.logs[0].event).to.equal('AppOwnerAdded');
      expect(result1.logs[0].type).to.equal('mined');
      expect(result1.logs[0].args._appId).to.equal('somenewappid');
      expect(result1.logs[0].args._owner).to.equal(accounts[4]);
      const result2 = await contract.addAppOwner(
        'someothernewappid',
        accounts[4],
        {
          from: accounts[0],
        }
      );
      expect(result2.logs.length).to.equal(2);
      expect(result2.logs[0].event).to.equal('AppCreated');
      expect(result2.logs[0].type).to.equal('mined');
      expect(result2.logs[0].args._appId).to.equal('someothernewappid');
      expect(result2.logs[1].event).to.equal('AppOwnerAdded');
      expect(result2.logs[1].type).to.equal('mined');
      expect(result2.logs[1].args._appId).to.equal('someothernewappid');
      expect(result2.logs[1].args._owner).to.equal(accounts[4]);
    });

    it('should require _appId', () => {
      return contract
        .addAppOwner('', accounts[6])
        .should.be.rejectedWith(/_appId is required/);
    });

    it('should not allow duplicated owners', async () => {
      contract
        .addAppOwner('someothernewappid', accounts[4])
        .should.be.rejectedWith(/The address is already an app owner/);
      const result1 = await contract.removeAppOwner(
        'someothernewappid',
        accounts[4]
      );
      expect(result1.logs.length).to.equal(1);
      expect(result1.logs[0].event).to.equal('AppOwnerRemoved');
      expect(result1.logs[0].type).to.equal('mined');
      expect(result1.logs[0].args._appId).to.equal('someothernewappid');
      expect(result1.logs[0].args._owner).to.equal(accounts[4]);
      const result2 = await contract.addAppOwner(
        'someothernewappid',
        accounts[4]
      );
      expect(result2.logs.length).to.equal(1);
      expect(result2.logs[0].event).to.equal('AppOwnerAdded');
      expect(result2.logs[0].type).to.equal('mined');
      expect(result2.logs[0].args._appId).to.equal('someothernewappid');
      expect(result2.logs[0].args._owner).to.equal(accounts[4]);
    });
  });

  describe('removeAppOwner', () => {
    it('should remove app owner', async () => {
      const result = await contract.removeAppOwner('somenewappid', accounts[3]);
      expect(result.logs.length).to.equal(1);
      expect(result.logs[0].event).to.equal('AppOwnerRemoved');
      expect(result.logs[0].type).to.equal('mined');
      expect(result.logs[0].args._appId).to.equal('somenewappid');
      expect(result.logs[0].args._owner).to.equal(accounts[3]);
      await contract
        .createObject(
          'somenewappid',
          'SomeClass',
          'someothernewobjectid',
          JSON.stringify({ someField: 'someValue' }),
          {
            from: accounts[3],
          }
        )
        .should.be.rejectedWith(
          /This function is restricted to the contract and app owners/
        );
      await contract
        .addAppOwner('somenewappid', accounts[8], {
          from: accounts[3],
        })
        .should.be.rejectedWith(
          /This function is restricted to the contract and app owners/
        );
    });

    it('should be restricted to the contract and app owners', async () => {
      await contract
        .removeAppOwner('someappid', accounts[1], { from: accounts[7] })
        .should.be.rejectedWith(
          /This function is restricted to the contract and app owners/
        );
      const result1 = await contract.addAppOwner('someappid', accounts[7], {
        from: accounts[1],
      });
      expect(result1.logs.length).to.equal(1);
      expect(result1.logs[0].event).to.equal('AppOwnerAdded');
      expect(result1.logs[0].type).to.equal('mined');
      expect(result1.logs[0].args._appId).to.equal('someappid');
      expect(result1.logs[0].args._owner).to.equal(accounts[7]);
      const result2 = await contract.removeAppOwner('someappid', accounts[1], {
        from: accounts[7],
      });
      expect(result2.logs.length).to.equal(1);
      expect(result2.logs[0].event).to.equal('AppOwnerRemoved');
      expect(result2.logs[0].type).to.equal('mined');
      expect(result2.logs[0].args._appId).to.equal('someappid');
      expect(result2.logs[0].args._owner).to.equal(accounts[1]);
      const result3 = await contract.removeAppOwner('someappid', accounts[7]);
      expect(result3.logs.length).to.equal(1);
      expect(result3.logs[0].event).to.equal('AppOwnerRemoved');
      expect(result3.logs[0].type).to.equal('mined');
      expect(result3.logs[0].args._appId).to.equal('someappid');
      expect(result3.logs[0].args._owner).to.equal(accounts[7]);
    });

    it('should require _appId', () => {
      return contract
        .removeAppOwner('', accounts[1])
        .should.be.rejectedWith(/_appId is required/);
    });

    it('should not allow to remove the owner twice', async () => {
      await contract
        .removeAppOwner('somenewappid', accounts[3])
        .should.be.rejectedWith(/The address is not an app owner/);
      const result1 = await contract.addAppOwner('somenewappid', accounts[3]);
      expect(result1.logs.length).to.equal(1);
      expect(result1.logs[0].event).to.equal('AppOwnerAdded');
      expect(result1.logs[0].type).to.equal('mined');
      expect(result1.logs[0].args._appId).to.equal('somenewappid');
      expect(result1.logs[0].args._owner).to.equal(accounts[3]);
      const result2 = await contract.removeAppOwner(
        'somenewappid',
        accounts[3]
      );
      expect(result2.logs.length).to.equal(1);
      expect(result2.logs[0].event).to.equal('AppOwnerRemoved');
      expect(result2.logs[0].type).to.equal('mined');
      expect(result2.logs[0].args._appId).to.equal('somenewappid');
      expect(result2.logs[0].args._owner).to.equal(accounts[3]);
    });
  });
});
