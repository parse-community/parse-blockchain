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
      worker.initialize(fakeBlockchainAdapter, fakeAdapter);

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
            blockchainResult,
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
          get: () => Promise.resolve({}),
        },
        simpleMQAdapter
      );

      simpleMQAdapter.publish(
        `${Parse.applicationId}-parse-server-blockchain`,
        JSON.stringify(someObject._toFullJSON())
      );
    });
  });
});
