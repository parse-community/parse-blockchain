import { CoreManager, Parse } from 'parse/node';
import MQAdapter from '../src/MQAdapter';
import SimpleMQAdapter from '../src/SimpleMQAdapter';
import { BlockchainStatus } from '../src/types';
import Worker from '../src/Worker';

const fakeBlockchainAdapter = {
  send: () => Promise.resolve({}),
  get: () => Promise.resolve({}),
};

describe('Worker', () => {
  beforeAll(() => {
    Parse.initialize('someappid', 'somejavascriptkey', 'somemasterkey');
  });

  describe('initialize', () => {
    it('should initialize', () => {
      new Worker().initialize(fakeBlockchainAdapter);
    });

    it('should not initialize twice', () => {
      const worker = new Worker();
      worker.initialize(fakeBlockchainAdapter);
      expect(() => worker.initialize(fakeBlockchainAdapter)).toThrowError(
        'The worker is already initialized'
      );
    });

    it('should initialize with custom adapter', () => {
      class FakeAdapter implements MQAdapter {
        publish: (queue: string, message: string) => void;
        consume() {
          return {
            unsubscribe: () => undefined,
          };
        }
      }

      const fakeAdapter = new FakeAdapter();

      const worker = new Worker();
      worker.initialize(fakeBlockchainAdapter, fakeAdapter, {
        waitSendingAttempts: 30,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((worker as any).mqAdapter).toBe(fakeAdapter);
    });
  });

  describe('handleMessage', () => {
    it('should send messages to the blockchain adapter', (done) => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';

      const blockchainResult = { someField: 'someValue' };

      let findCalls = 0;
      const queryController = CoreManager.getQueryController();
      const originalQueryControllerFind = queryController.find;
      queryController.find = (className, params, options) => {
        findCalls++;
        expect(className).toBe('SomeClass');
        expect(params).toEqual({ limit: 1, where: { objectId: 'someid' } });
        expect(options.useMasterKey).toBe(true);
        return Promise.resolve({ results: [someObject] });
      };

      let saveCalls = 0;
      const objectController = CoreManager.getObjectController();
      const originalObjectControllerSave = objectController.save;
      objectController.save = (object, options) => {
        saveCalls++;
        expect(findCalls).toEqual(1);
        if (saveCalls === 1) {
          expect(object).toEqual([]);
          expect(options).toEqual({ useMasterKey: true });
          return Promise.resolve([]);
        } else if (saveCalls === 2) {
          expect(object._toFullJSON()).toEqual({
            ...someObject._toFullJSON(),
            blockchainStatus: BlockchainStatus.Sending,
          });
          expect(options).toEqual({ useMasterKey: true });
          return Promise.resolve(object);
        } else if (saveCalls === 3) {
          expect(object).toEqual([]);
          expect(options).toEqual({ useMasterKey: true });
          return Promise.resolve([]);
        } else if (saveCalls === 4) {
          expect(object._toFullJSON()).toEqual({
            ...someObject._toFullJSON(),
            blockchainStatus: BlockchainStatus.Sent,
            blockchainResult: {
              type: 'Send',
              input: JSON.stringify(someObject._toFullJSON()),
              output: blockchainResult,
            },
          });
          expect(options).toEqual({ useMasterKey: true });

          queryController.find = originalQueryControllerFind;
          objectController.save = originalObjectControllerSave;
          done();

          return Promise.resolve(object);
        } else {
          throw new Error('Should call only 4 times');
        }
      };

      const worker = new Worker();
      worker.initialize(
        {
          send: (parseObjectFullJSON: Record<string, unknown>) => {
            expect(parseObjectFullJSON).toEqual(someObject._toFullJSON());
            return Promise.resolve(blockchainResult);
          },
          get: () => Promise.resolve({}),
        },
        simpleMQAdapter
      );

      simpleMQAdapter.publish(
        `${Parse.applicationId}-parse-server-blockchain`,
        JSON.stringify(someObject._toFullJSON())
      );
    });

    it('should handle blockchain fail', (done) => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';

      let findCalls = 0;
      const queryController = CoreManager.getQueryController();
      const originalQueryControllerFind = queryController.find;
      queryController.find = (className, params, options) => {
        findCalls++;
        expect(className).toBe('SomeClass');
        expect(params).toEqual({ limit: 1, where: { objectId: 'someid' } });
        expect(options.useMasterKey).toBe(true);
        return Promise.resolve({ results: [someObject] });
      };

      const error = new Error('Some Error');

      let saveCalls = 0;
      const objectController = CoreManager.getObjectController();
      const originalObjectControllerSave = objectController.save;
      objectController.save = (object, options) => {
        saveCalls++;
        expect(findCalls).toEqual(1);
        if (saveCalls === 1) {
          expect(object).toEqual([]);
          expect(options).toEqual({ useMasterKey: true });
          return Promise.resolve([]);
        } else if (saveCalls === 2) {
          expect(object._toFullJSON()).toEqual({
            ...someObject._toFullJSON(),
            blockchainStatus: BlockchainStatus.Sending,
          });
          expect(options).toEqual({ useMasterKey: true });
          return Promise.resolve(object);
        } else if (saveCalls === 3) {
          expect(object).toEqual([]);
          expect(options).toEqual({ useMasterKey: true });
          return Promise.resolve([]);
        } else if (saveCalls === 4) {
          expect(object._toFullJSON()).toEqual({
            ...someObject._toFullJSON(),
            blockchainStatus: BlockchainStatus.Failed,
            blockchainResult: {
              type: 'Error',
              input: JSON.stringify(someObject._toFullJSON()),
              error: error.toString(),
            },
          });
          expect(options).toEqual({ useMasterKey: true });

          queryController.find = originalQueryControllerFind;
          objectController.save = originalObjectControllerSave;
          done();

          return Promise.resolve(object);
        } else {
          throw new Error('Should call only 4 times');
        }
      };

      const worker = new Worker();
      worker.initialize(
        {
          send: () => {
            throw error;
          },
          get: () => Promise.resolve({}),
        },
        simpleMQAdapter
      );

      simpleMQAdapter.publish(
        `${Parse.applicationId}-parse-server-blockchain`,
        JSON.stringify(someObject._toFullJSON())
      );
    });

    it('should nack if cannot get object status', (done) => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';

      const blockchainResult = { someField: 'someValue' };

      let findCalls = 0;
      const queryController = CoreManager.getQueryController();
      const originalQueryControllerFind = queryController.find;
      queryController.find = (className, params, options) => {
        findCalls++;
        expect(className).toBe('SomeClass');
        expect(params).toEqual({ limit: 1, where: { objectId: 'someid' } });
        expect(options.useMasterKey).toBe(true);
        if (findCalls === 1) {
          throw new Error('Some Error');
        } else {
          return Promise.resolve({ results: [someObject] });
        }
      };

      let saveCalls = 0;
      const objectController = CoreManager.getObjectController();
      const originalObjectControllerSave = objectController.save;
      objectController.save = (object, options) => {
        saveCalls++;
        expect(findCalls).toEqual(2);
        if (saveCalls === 1) {
          expect(object).toEqual([]);
          expect(options).toEqual({ useMasterKey: true });
          return Promise.resolve([]);
        } else if (saveCalls === 2) {
          expect(object._toFullJSON()).toEqual({
            ...someObject._toFullJSON(),
            blockchainStatus: BlockchainStatus.Sending,
          });
          expect(options).toEqual({ useMasterKey: true });
          return Promise.resolve(object);
        } else if (saveCalls === 3) {
          expect(object).toEqual([]);
          expect(options).toEqual({ useMasterKey: true });
          return Promise.resolve([]);
        } else if (saveCalls === 4) {
          expect(object._toFullJSON()).toEqual({
            ...someObject._toFullJSON(),
            blockchainStatus: BlockchainStatus.Sent,
            blockchainResult: {
              type: 'Send',
              input: JSON.stringify(someObject._toFullJSON()),
              output: blockchainResult,
            },
          });
          expect(options).toEqual({ useMasterKey: true });

          queryController.find = originalQueryControllerFind;
          objectController.save = originalObjectControllerSave;
          done();

          return Promise.resolve(object);
        } else {
          throw new Error('Should call only 4 times');
        }
      };

      const worker = new Worker();
      worker.initialize(
        {
          send: (parseObjectFullJSON: Record<string, unknown>) => {
            expect(parseObjectFullJSON).toEqual(someObject._toFullJSON());
            return Promise.resolve(blockchainResult);
          },
          get: () => Promise.resolve({}),
        },
        simpleMQAdapter
      );

      simpleMQAdapter.publish(
        `${Parse.applicationId}-parse-server-blockchain`,
        JSON.stringify(someObject._toFullJSON())
      );
    });

    it('should nack if cannot update object status to sending', (done) => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';

      const blockchainResult = { someField: 'someValue' };

      let findCalls = 0;
      const queryController = CoreManager.getQueryController();
      const originalQueryControllerFind = queryController.find;
      queryController.find = (className, params, options) => {
        findCalls++;
        expect(className).toBe('SomeClass');
        expect(params).toEqual({ limit: 1, where: { objectId: 'someid' } });
        expect(options.useMasterKey).toBe(true);
        return Promise.resolve({ results: [someObject] });
      };

      let saveCalls = 0;
      const objectController = CoreManager.getObjectController();
      const originalObjectControllerSave = objectController.save;
      objectController.save = (object, options) => {
        saveCalls++;
        if (saveCalls === 1) {
          expect(findCalls).toEqual(1);
          expect(object).toEqual([]);
          expect(options).toEqual({ useMasterKey: true });
          return Promise.resolve([]);
        } else if (saveCalls === 2) {
          expect(findCalls).toEqual(1);
          expect(object._toFullJSON()).toEqual({
            ...someObject._toFullJSON(),
            blockchainStatus: BlockchainStatus.Sending,
          });
          expect(options).toEqual({ useMasterKey: true });
          throw new Error('Some Error');
        } else if (saveCalls === 3) {
          expect(findCalls).toEqual(2);
          expect(object).toEqual([]);
          expect(options).toEqual({ useMasterKey: true });
          return Promise.resolve([]);
        } else if (saveCalls === 4) {
          expect(findCalls).toEqual(2);
          expect(object._toFullJSON()).toEqual({
            ...someObject._toFullJSON(),
            blockchainStatus: BlockchainStatus.Sending,
          });
          expect(options).toEqual({ useMasterKey: true });
          return Promise.resolve(object);
        } else if (saveCalls === 5) {
          expect(findCalls).toEqual(2);
          expect(object).toEqual([]);
          expect(options).toEqual({ useMasterKey: true });
          return Promise.resolve([]);
        } else if (saveCalls === 6) {
          expect(findCalls).toEqual(2);
          expect(object._toFullJSON()).toEqual({
            ...someObject._toFullJSON(),
            blockchainStatus: BlockchainStatus.Sent,
            blockchainResult: {
              type: 'Send',
              input: JSON.stringify(someObject._toFullJSON()),
              output: blockchainResult,
            },
          });
          expect(options).toEqual({ useMasterKey: true });

          queryController.find = originalQueryControllerFind;
          objectController.save = originalObjectControllerSave;
          done();

          return Promise.resolve(object);
        } else {
          throw new Error('Should call only 6 times');
        }
      };

      const worker = new Worker();
      worker.initialize(
        {
          send: (parseObjectFullJSON: Record<string, unknown>) => {
            expect(parseObjectFullJSON).toEqual(someObject._toFullJSON());
            return Promise.resolve(blockchainResult);
          },
          get: () => Promise.resolve({}),
        },
        simpleMQAdapter
      );

      simpleMQAdapter.publish(
        `${Parse.applicationId}-parse-server-blockchain`,
        JSON.stringify(someObject._toFullJSON())
      );
    });

    it('should ack if object has status and it is not sending', (done) => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';

      const blockchainResult = { someField: 'someValue' };

      let findCalls = 0;
      const queryController = CoreManager.getQueryController();
      const originalQueryControllerFind = queryController.find;
      queryController.find = (className, params, options) => {
        findCalls++;
        expect(className).toBe('SomeClass');
        expect(params).toEqual({ limit: 1, where: { objectId: 'someid' } });
        expect(options.useMasterKey).toBe(true);
        if (findCalls === 1) {
          return Promise.resolve({
            results: [
              {
                ...someObject._toFullJSON(),
                blockchainStatus: BlockchainStatus.Sending,
              },
            ],
          });
        } else {
          queryController.find = originalQueryControllerFind;
          done();

          return Promise.resolve({
            results: [
              {
                ...someObject._toFullJSON(),
                blockchainStatus: BlockchainStatus.Sent,
              },
            ],
          });
        }
      };

      const worker = new Worker();
      worker.initialize(
        {
          send: (parseObjectFullJSON: Record<string, unknown>) => {
            expect(parseObjectFullJSON).toEqual(someObject._toFullJSON());
            return Promise.resolve(blockchainResult);
          },
          get: () => Promise.resolve({}),
        },
        simpleMQAdapter,
        {
          waitSendingSleepMS: 1,
        }
      );

      simpleMQAdapter.publish(
        `${Parse.applicationId}-parse-server-blockchain`,
        JSON.stringify(someObject._toFullJSON())
      );
    });

    it('should check the object on blockchain if the status is still sending after the wait time', (done) => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';

      const blockchainResult = { someField: 'someValue' };

      let findCalls = 0;
      const queryController = CoreManager.getQueryController();
      const originalQueryControllerFind = queryController.find;
      queryController.find = (className, params, options) => {
        findCalls++;
        expect(className).toBe('SomeClass');
        expect(params).toEqual({ limit: 1, where: { objectId: 'someid' } });
        expect(options.useMasterKey).toBe(true);
        return Promise.resolve({
          results: [
            {
              ...someObject._toFullJSON(),
              blockchainStatus: BlockchainStatus.Sending,
            },
          ],
        });
      };

      let getCalls = 0;
      let saveCalls = 0;
      const objectController = CoreManager.getObjectController();
      const originalObjectControllerSave = objectController.save;
      objectController.save = (object, options) => {
        saveCalls++;
        expect(findCalls).toEqual(5);
        expect(getCalls).toEqual(1);
        if (saveCalls === 1) {
          expect(object).toEqual([]);
          expect(options).toEqual({ useMasterKey: true });
          return Promise.resolve([]);
        } else if (saveCalls === 2) {
          expect(object._toFullJSON()).toEqual({
            ...someObject._toFullJSON(),
            blockchainStatus: BlockchainStatus.Sent,
            blockchainResult: {
              type: 'Get',
              input: {
                className: 'SomeClass',
                objectId: 'someid',
              },
              output: blockchainResult,
            },
          });
          expect(options).toEqual({ useMasterKey: true });

          queryController.find = originalQueryControllerFind;
          objectController.save = originalObjectControllerSave;
          done();

          return Promise.resolve(object);
        } else {
          throw new Error('Should call only 2 times');
        }
      };

      const worker = new Worker();
      worker.initialize(
        {
          send: () => {
            throw new Error('Should not send');
          },
          get: () => {
            getCalls++;
            return Promise.resolve(blockchainResult);
          },
        },
        simpleMQAdapter,
        {
          waitSendingAttempts: 5,
          waitSendingSleepMS: 1,
        }
      );

      simpleMQAdapter.publish(
        `${Parse.applicationId}-parse-server-blockchain`,
        JSON.stringify(someObject._toFullJSON())
      );
    });

    it('should send the object again to blockchain if the status is still sending after the wait time and object was not found', (done) => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';

      const blockchainResult = { someField: 'someValue' };

      let findCalls = 0;
      const queryController = CoreManager.getQueryController();
      const originalQueryControllerFind = queryController.find;
      queryController.find = (className, params, options) => {
        findCalls++;
        expect(className).toBe('SomeClass');
        expect(params).toEqual({ limit: 1, where: { objectId: 'someid' } });
        expect(options.useMasterKey).toBe(true);
        return Promise.resolve({
          results: [
            {
              ...someObject._toFullJSON(),
              blockchainStatus: BlockchainStatus.Sending,
            },
          ],
        });
      };

      let getCalls = 0;
      let saveCalls = 0;
      const objectController = CoreManager.getObjectController();
      const originalObjectControllerSave = objectController.save;
      objectController.save = (object, options) => {
        saveCalls++;
        expect(findCalls).toEqual(5);
        expect(getCalls).toEqual(1);
        if (saveCalls === 1) {
          expect(object).toEqual([]);
          expect(options).toEqual({ useMasterKey: true });
          return Promise.resolve([]);
        } else if (saveCalls === 2) {
          expect(object._toFullJSON()).toEqual({
            ...someObject._toFullJSON(),
            blockchainStatus: BlockchainStatus.Sent,
            blockchainResult: {
              type: 'Send',
              input: JSON.stringify(someObject._toFullJSON()),
              output: blockchainResult,
            },
          });
          expect(options).toEqual({ useMasterKey: true });

          queryController.find = originalQueryControllerFind;
          objectController.save = originalObjectControllerSave;
          done();

          return Promise.resolve(object);
        } else {
          throw new Error('Should call only 2 times');
        }
      };

      const worker = new Worker();
      worker.initialize(
        {
          send: (parseObjectFullJSON: Record<string, unknown>) => {
            expect(parseObjectFullJSON).toEqual(someObject._toFullJSON());
            return Promise.resolve(blockchainResult);
          },
          get: (className, objectId) => {
            getCalls++;
            expect(className).toBe('SomeClass');
            expect(objectId).toBe('someid');
            throw new Error('The object does not exist');
          },
        },
        simpleMQAdapter,
        {
          waitSendingAttempts: 5,
          waitSendingSleepMS: 1,
        }
      );

      simpleMQAdapter.publish(
        `${Parse.applicationId}-parse-server-blockchain`,
        JSON.stringify(someObject._toFullJSON())
      );
    });

    it('should nack if cannot check the object on blockchain if the status is still sending after the wait time', (done) => {
      const simpleMQAdapter = new SimpleMQAdapter();

      const someObject = new Parse.Object('SomeClass');
      someObject.id = 'someid';

      const blockchainResult = { someField: 'someValue' };

      let findCalls = 0;
      const queryController = CoreManager.getQueryController();
      const originalQueryControllerFind = queryController.find;
      queryController.find = (className, params, options) => {
        findCalls++;
        expect(className).toBe('SomeClass');
        expect(params).toEqual({ limit: 1, where: { objectId: 'someid' } });
        expect(options.useMasterKey).toBe(true);
        return Promise.resolve({
          results: [
            {
              ...someObject._toFullJSON(),
              blockchainStatus: BlockchainStatus.Sending,
            },
          ],
        });
      };

      let getCalls = 0;
      let saveCalls = 0;
      const objectController = CoreManager.getObjectController();
      const originalObjectControllerSave = objectController.save;
      objectController.save = (object, options) => {
        saveCalls++;
        expect(findCalls).toEqual(10);
        expect(getCalls).toEqual(2);
        if (saveCalls === 1) {
          expect(object).toEqual([]);
          expect(options).toEqual({ useMasterKey: true });
          return Promise.resolve([]);
        } else if (saveCalls === 2) {
          expect(object._toFullJSON()).toEqual({
            ...someObject._toFullJSON(),
            blockchainStatus: BlockchainStatus.Sent,
            blockchainResult: {
              type: 'Get',
              input: {
                className: 'SomeClass',
                objectId: 'someid',
              },
              output: blockchainResult,
            },
          });
          expect(options).toEqual({ useMasterKey: true });

          queryController.find = originalQueryControllerFind;
          objectController.save = originalObjectControllerSave;
          done();

          return Promise.resolve(object);
        } else {
          throw new Error('Should call only 2 times');
        }
      };

      const worker = new Worker();
      worker.initialize(
        {
          send: () => {
            throw new Error('Should not send');
          },
          get: () => {
            getCalls++;
            if (getCalls === 1) {
              throw new Error('Some Error');
            } else {
              return Promise.resolve(blockchainResult);
            }
          },
        },
        simpleMQAdapter,
        {
          waitSendingAttempts: 5,
          waitSendingSleepMS: 1,
        }
      );

      simpleMQAdapter.publish(
        `${Parse.applicationId}-parse-server-blockchain`,
        JSON.stringify(someObject._toFullJSON())
      );
    });
  });

  it('should nack if cannot update object status to sent or failed', (done) => {
    const simpleMQAdapter = new SimpleMQAdapter();

    const someObject = new Parse.Object('SomeClass');
    someObject.id = 'someid';

    const blockchainResult = { someField: 'someValue' };

    let findCalls = 0;
    const queryController = CoreManager.getQueryController();
    const originalQueryControllerFind = queryController.find;
    queryController.find = (className, params, options) => {
      findCalls++;
      expect(className).toBe('SomeClass');
      expect(params).toEqual({ limit: 1, where: { objectId: 'someid' } });
      expect(options.useMasterKey).toBe(true);
      if (findCalls === 1) {
        return Promise.resolve({ results: [someObject] });
      } else {
        return Promise.resolve({
          results: [
            {
              ...someObject._toFullJSON(),
              blockchainStatus: BlockchainStatus.Sending,
            },
          ],
        });
      }
    };

    let saveCalls = 0;
    const objectController = CoreManager.getObjectController();
    const originalObjectControllerSave = objectController.save;
    objectController.save = (object, options) => {
      saveCalls++;
      if (saveCalls === 1) {
        expect(findCalls).toEqual(1);
        expect(object).toEqual([]);
        expect(options).toEqual({ useMasterKey: true });
        return Promise.resolve([]);
      } else if (saveCalls === 2) {
        expect(findCalls).toEqual(1);
        expect(object._toFullJSON()).toEqual({
          ...someObject._toFullJSON(),
          blockchainStatus: BlockchainStatus.Sending,
        });
        expect(options).toEqual({ useMasterKey: true });
        return Promise.resolve(object);
      } else if (saveCalls === 3) {
        expect(findCalls).toEqual(1);
        expect(object).toEqual([]);
        expect(options).toEqual({ useMasterKey: true });
        return Promise.resolve([]);
      } else if (saveCalls === 4) {
        expect(findCalls).toEqual(1);
        expect(object._toFullJSON()).toEqual({
          ...someObject._toFullJSON(),
          blockchainStatus: BlockchainStatus.Sent,
          blockchainResult: {
            type: 'Send',
            input: JSON.stringify(someObject._toFullJSON()),
            output: blockchainResult,
          },
        });
        expect(options).toEqual({ useMasterKey: true });
        throw new Error('Some Error');
      } else if (saveCalls === 5) {
        expect(findCalls).toEqual(6);
        expect(object).toEqual([]);
        expect(options).toEqual({ useMasterKey: true });
        return Promise.resolve([]);
      } else if (saveCalls === 6) {
        expect(findCalls).toEqual(6);
        expect(object._toFullJSON()).toEqual({
          ...someObject._toFullJSON(),
          blockchainStatus: BlockchainStatus.Sent,
          blockchainResult: {
            type: 'Get',
            input: {
              className: 'SomeClass',
              objectId: 'someid',
            },
            output: blockchainResult,
          },
        });
        expect(options).toEqual({ useMasterKey: true });

        queryController.find = originalQueryControllerFind;
        objectController.save = originalObjectControllerSave;
        done();

        return Promise.resolve(object);
      } else {
        throw new Error('Should call only 6 times');
      }
    };

    const worker = new Worker();
    worker.initialize(
      {
        send: (parseObjectFullJSON: Record<string, unknown>) => {
          expect(parseObjectFullJSON).toEqual(someObject._toFullJSON());
          return Promise.resolve(blockchainResult);
        },
        get: (className, objectId) => {
          expect(className).toBe('SomeClass');
          expect(objectId).toBe('someid');
          return Promise.resolve(blockchainResult);
        },
      },
      simpleMQAdapter,
      {
        waitSendingAttempts: 5,
        waitSendingSleepMS: 1,
      }
    );

    simpleMQAdapter.publish(
      `${Parse.applicationId}-parse-server-blockchain`,
      JSON.stringify(someObject._toFullJSON())
    );
  });
});
