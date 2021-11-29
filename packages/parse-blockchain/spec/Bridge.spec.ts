import { Parse } from 'parse/node';

global.Parse = Parse;

import * as triggers from 'parse-server/lib/triggers';
import { BlockchainStatus } from '../src/types';
import MQAdapter, { Listener, Subscription } from '../src/MQAdapter';
import SimpleMQAdapter from '../src/SimpleMQAdapter';
import Bridge from '../src/Bridge';

describe('Bridge', () => {
  beforeAll(() => {
    Parse.initialize('someappid');
  });

  describe('initialize', () => {
    it('should initialize', () => {
      new Bridge().initialize([]);
    });

    it('should not initialize twice', () => {
      const bridge = new Bridge();
      bridge.initialize([]);
      expect(() => bridge.initialize([])).toThrowError(
        'The bridge is already initialized'
      );
    });

    it('should initialize with custom adapter', () => {
      class FakeAdapter implements MQAdapter {
        publish: (queue: string, message: string) => void;
        consume: (queue: string, listener: Listener) => Subscription;
      }

      const fakeAdapter = new FakeAdapter();

      const bridge = new Bridge();
      bridge.initialize([], fakeAdapter);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((bridge as any).mqAdapter).toBe(fakeAdapter);
    });
  });

  describe('handleGetTrigger', () => {
    it('should return default before delete handler on blockchain classes', () => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const bridge = new Bridge();
      bridge.initialize(['SomeClass'], simpleMQAdapter);

      expect(
        triggers.getTrigger(
          'SomeClass',
          triggers.Types.beforeDelete,
          Parse.applicationId
        )
      ).toThrow(/unauthorized: cannot delete objects on blockchain bridge/);
    });

    it('should run original function otherwise', () => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const bridge = new Bridge();
      bridge.initialize(['SomeClass'], simpleMQAdapter);

      expect(
        triggers.getTrigger(
          'SomeOtherClass',
          triggers.Types.beforeDelete,
          Parse.applicationId
        )
      ).toBe(undefined);
      expect(
        triggers.getTrigger(
          'SomeClass',
          triggers.Types.afterSave,
          Parse.applicationId
        )
      ).toBe(undefined);
    });
  });

  describe('handleTriggerExists', () => {
    it('should return true for beforeSave, afterSave, and afterDelete triggers on blockchain classes', () => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const bridge = new Bridge();
      bridge.initialize(['SomeClass'], simpleMQAdapter);

      expect(
        triggers.triggerExists(
          'SomeClass',
          triggers.Types.beforeSave,
          Parse.applicationId
        )
      ).toBe(true);
      expect(
        triggers.triggerExists(
          'SomeClass',
          triggers.Types.afterSave,
          Parse.applicationId
        )
      ).toBe(true);
      expect(
        triggers.triggerExists(
          'SomeClass',
          triggers.Types.beforeDelete,
          Parse.applicationId
        )
      ).toBe(true);
    });

    it('should return false for beforeSave, afterSave, and afterDelete triggers on regular classes without triggers', () => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const bridge = new Bridge();
      bridge.initialize(['SomeClass'], simpleMQAdapter);

      expect(
        triggers.triggerExists(
          'SomeOtherClass',
          triggers.Types.beforeSave,
          Parse.applicationId
        )
      ).toBe(false);
      expect(
        triggers.triggerExists(
          'SomeOtherClass',
          triggers.Types.afterSave,
          Parse.applicationId
        )
      ).toBe(false);
      expect(
        triggers.triggerExists(
          'SomeOtherClass',
          triggers.Types.beforeDelete,
          Parse.applicationId
        )
      ).toBe(false);
    });
  });

  describe('handleMaybeRunTrigger', () => {
    it('should publish new blockchain classes objects on after save', async () => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const bridge = new Bridge();
      bridge.initialize(['SomeClass'], simpleMQAdapter);

      let published = false;

      simpleMQAdapter.consume(
        `${Parse.applicationId}-parse-server-blockchain`,
        (message, ack) => {
          expect(JSON.parse(message)).toEqual({
            className: 'SomeClass',
            __type: 'Object',
            objectId: 'someid',
          });
          ack();
          published = true;
        }
      );

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';

      await triggers.maybeRunTrigger(
        triggers.Types.afterSave,
        {},
        someObject,
        null,
        {
          applicationId: Parse.applicationId,
        }
      );

      expect(published).toBeTruthy();
    });

    it('should not publish new regular classes objects on after save', async () => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const bridge = new Bridge();
      bridge.initialize(['SomeClass'], simpleMQAdapter);

      simpleMQAdapter.consume(
        `${Parse.applicationId}-parse-server-blockchain`,
        () => {
          throw new Error('Should not receive message');
        }
      );

      const someObject = new Parse.Object('SomeOtherClass');
      someObject.id = 'someid';

      await triggers.maybeRunTrigger(
        triggers.Types.afterSave,
        {},
        someObject,
        null,
        {
          applicationId: Parse.applicationId,
        },
        {}
      );
    });

    it('should throw error for new blockchain classes objects with blockchainStatus on before save', async () => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const bridge = new Bridge();
      bridge.initialize(['SomeClass'], simpleMQAdapter);

      simpleMQAdapter.consume(
        `${Parse.applicationId}-parse-server-blockchain`,
        () => {
          throw new Error('Should not receive message');
        }
      );

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';
      someObject.set('blockchainStatus', BlockchainStatus.Sending);

      try {
        await triggers.maybeRunTrigger(
          triggers.Types.beforeSave,
          {},
          someObject,
          null,
          {
            applicationId: Parse.applicationId,
          },
          {}
        );
        throw new Error('Should throw error');
      } catch (e) {
        expect(e).toBeInstanceOf(Parse.Error);
        expect(e.code).toBe(Parse.Error.OPERATION_FORBIDDEN);
        expect(e.message).toBe(
          'unauthorized: cannot set blockchainStatus field'
        );
      }
    });

    it('should throw error for new blockchain classes objects with blockchainResult on before save', async () => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const bridge = new Bridge();
      bridge.initialize(['SomeClass'], simpleMQAdapter);

      simpleMQAdapter.consume(
        `${Parse.applicationId}-parse-server-blockchain`,
        () => {
          throw new Error('Should not receive message');
        }
      );

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';
      someObject.set('blockchainResult', {});

      try {
        await triggers.maybeRunTrigger(
          triggers.Types.beforeSave,
          {},
          someObject,
          null,
          {
            applicationId: Parse.applicationId,
          },
          {}
        );
        throw new Error('Should throw error');
      } catch (e) {
        expect(e).toBeInstanceOf(Parse.Error);
        expect(e.code).toBe(Parse.Error.OPERATION_FORBIDDEN);
        expect(e.message).toBe(
          'unauthorized: cannot set blockchainResult field'
        );
      }
    });

    it('should not throw error for new blockchain classes objects when not setting blockchainStatus nor blockchainResult on before save', async () => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const bridge = new Bridge();
      bridge.initialize(['SomeClass'], simpleMQAdapter);

      simpleMQAdapter.consume(
        `${Parse.applicationId}-parse-server-blockchain`,
        () => {
          throw new Error('Should not receive message');
        }
      );

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';

      await triggers.maybeRunTrigger(
        triggers.Types.beforeSave,
        {},
        someObject,
        null,
        {
          applicationId: Parse.applicationId,
        },
        {}
      );
    });

    it('should throw error for existing blockchain classes objects on before save', async () => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const bridge = new Bridge();
      bridge.initialize(['SomeClass'], simpleMQAdapter);

      simpleMQAdapter.consume(
        `${Parse.applicationId}-parse-server-blockchain`,
        () => {
          throw new Error('Should not receive message');
        }
      );

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';

      try {
        await triggers.maybeRunTrigger(
          triggers.Types.beforeSave,
          {},
          someObject,
          Object.assign(someObject, {
            fetch: () => Promise.resolve(),
          }),
          {
            applicationId: Parse.applicationId,
          },
          {}
        );
        throw new Error('Should throw error');
      } catch (e) {
        expect(e).toBeInstanceOf(Parse.Error);
        expect(e.code).toBe(Parse.Error.OPERATION_FORBIDDEN);
        expect(e.message).toBe(
          'unauthorized: cannot update objects on blockchain bridge'
        );
      }
    });

    it('should not throw error for existing blockchain classes objects when updating blockchainStatus to sending with master key on before save', async () => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const bridge = new Bridge();
      bridge.initialize(['SomeClass'], simpleMQAdapter);

      simpleMQAdapter.consume(
        `${Parse.applicationId}-parse-server-blockchain`,
        () => {
          throw new Error('Should not receive message');
        }
      );

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';

      const sameObject = new Parse.Object('SomeClass');
      sameObject.id = 'someid';
      sameObject.set('blockchainStatus', BlockchainStatus.Sending);

      await triggers.maybeRunTrigger(
        triggers.Types.beforeSave,
        { isMaster: true },
        sameObject,
        Object.assign(someObject, {
          fetch: () => Promise.resolve(),
        }),
        {
          applicationId: Parse.applicationId,
        },
        {}
      );
    });

    it('should not throw error for existing blockchain classes objects when updating blockchainStatus to sent with master key on before save', async () => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const bridge = new Bridge();
      bridge.initialize(['SomeClass'], simpleMQAdapter);

      simpleMQAdapter.consume(
        `${Parse.applicationId}-parse-server-blockchain`,
        () => {
          throw new Error('Should not receive message');
        }
      );

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';
      someObject.set('blockchainStatus', BlockchainStatus.Sending);

      const sameObject = new Parse.Object('SomeClass');
      sameObject.id = 'someid';
      sameObject.set('blockchainStatus', BlockchainStatus.Sent);
      sameObject.set('blockchainResult', {});

      await triggers.maybeRunTrigger(
        triggers.Types.beforeSave,
        { isMaster: true },
        sameObject,
        Object.assign(someObject, {
          fetch: () => Promise.resolve(),
        }),
        {
          applicationId: Parse.applicationId,
        },
        {}
      );
    });

    it('should not throw error for existing regular classes objects on before save', async () => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const bridge = new Bridge();
      bridge.initialize(['SomeClass'], simpleMQAdapter);

      simpleMQAdapter.consume(
        `${Parse.applicationId}-parse-server-blockchain`,
        () => {
          throw new Error('Should not receive message');
        }
      );

      const someObject = new Parse.Object('SomeOtherClass');
      someObject.id = 'someid';

      await triggers.maybeRunTrigger(
        triggers.Types.beforeSave,
        {},
        someObject,
        Object.assign(someObject, {
          fetch: () => Promise.resolve(),
        }),
        {
          applicationId: Parse.applicationId,
        },
        {}
      );
    });

    it('should throw error for existing blockchain classes objects on before delete', async () => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const bridge = new Bridge();
      bridge.initialize(['SomeClass'], simpleMQAdapter);

      simpleMQAdapter.consume(
        `${Parse.applicationId}-parse-server-blockchain`,
        () => {
          throw new Error('Should not receive message');
        }
      );

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';

      try {
        await triggers.maybeRunTrigger(
          triggers.Types.beforeDelete,
          {},
          someObject,
          null,
          {
            applicationId: Parse.applicationId,
          },
          {}
        );
        throw new Error('Should throw error');
      } catch (e) {
        expect(e).toBeInstanceOf(Parse.Error);
        expect(e.code).toBe(Parse.Error.OPERATION_FORBIDDEN);
        expect(e.message).toBe(
          'unauthorized: cannot delete objects on blockchain bridge'
        );
      }
    });

    it('should not throw error for existing regular classes objects on before delete', async () => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const bridge = new Bridge();
      bridge.initialize(['SomeClass'], simpleMQAdapter);

      simpleMQAdapter.consume(
        `${Parse.applicationId}-parse-server-blockchain`,
        () => {
          throw new Error('Should not receive message');
        }
      );

      const someObject = new Parse.Object('SomeOtherClass');
      someObject.id = 'someid';

      await triggers.maybeRunTrigger(
        triggers.Types.beforeDelete,
        {},
        someObject,
        null,
        {
          applicationId: Parse.applicationId,
        },
        {}
      );
    });

    it('should call other triggers for new blockchain classes objects', async () => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const bridge = new Bridge();
      bridge.initialize(['SomeClass'], simpleMQAdapter);

      let published = false;

      simpleMQAdapter.consume(
        `${Parse.applicationId}-parse-server-blockchain`,
        (message, ack) => {
          expect(JSON.parse(message)).toEqual({
            className: 'SomeClass',
            __type: 'Object',
            objectId: 'someid',
          });
          ack();
          published = true;
        }
      );

      let triggered = false;

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';

      let someOtherObject;

      triggers.addTrigger(
        triggers.Types.afterSave,
        'SomeClass',
        ({ object }) => {
          triggered = true;
          expect(object).toBe(someObject);
          someOtherObject = new Parse.Object('SomeClass');
          someOtherObject.id = 'someotherid';
          return someOtherObject;
        },
        Parse.applicationId
      );

      const result = await triggers.maybeRunTrigger(
        triggers.Types.afterSave,
        {},
        someObject,
        null,
        {
          applicationId: Parse.applicationId,
        },
        {}
      );

      expect(published).toBeTruthy();
      expect(triggered).toBeTruthy();
      expect(result).toBe(someOtherObject);

      triggers.removeTrigger(
        triggers.Types.afterSave,
        'SomeClass',
        Parse.applicationId
      );
    });

    it('should call other triggers for new regular classes objects', async () => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const bridge = new Bridge();
      bridge.initialize(['SomeOtherClass'], simpleMQAdapter);

      simpleMQAdapter.consume(
        `${Parse.applicationId}-parse-server-blockchain`,
        () => {
          throw new Error('Should not receive message');
        }
      );

      let triggered = false;

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';

      let someOtherObject;

      triggers.addTrigger(
        triggers.Types.afterSave,
        'SomeClass',
        ({ object }) => {
          triggered = true;
          expect(object).toBe(someObject);
          someOtherObject = new Parse.Object('SomeClass');
          someOtherObject.id = 'someotherid';
          return someOtherObject;
        },
        Parse.applicationId
      );

      const result = await triggers.maybeRunTrigger(
        triggers.Types.afterSave,
        {},
        someObject,
        null,
        {
          applicationId: Parse.applicationId,
        },
        {}
      );

      expect(triggered).toBeTruthy();
      expect(result).toBe(someOtherObject);

      triggers.removeTrigger(
        triggers.Types.afterSave,
        'SomeClass',
        Parse.applicationId
      );
    });
  });
});
