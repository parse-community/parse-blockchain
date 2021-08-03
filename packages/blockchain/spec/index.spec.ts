import * as index from '../src/index';
import SimpleMQAdapter from '../src/SimpleMQAdapter';
import Bridge from '../src/Bridge';
import Worker from '../src/Worker';

describe('index', () => {
  it('should export SimpleMQAdapter', () => {
    expect(index.SimpleMQAdapter).toBe(SimpleMQAdapter);
  });

  it('should export a bridge instance', () => {
    expect(index.bridge).toBeInstanceOf(Bridge);
  });

  it('should export a worker instance', () => {
    expect(index.worker).toBeInstanceOf(Worker);
  });
});
