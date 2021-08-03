import SimpleMQAdapter from '../src/SimpleMQAdapter';

describe('SimpleMQAdapter', () => {
  it('should publish to consumer', (done) => {
    const simpleMQAdapter = new SimpleMQAdapter();

    simpleMQAdapter.consume('somequeue', (message, ack) => {
      expect(message).toBe('somemessage');
      ack();
      done();
    });

    simpleMQAdapter.publish('somequeue', 'somemessage');
  });

  it('should publish to random consumers', () => {
    const simpleMQAdapter = new SimpleMQAdapter();

    let currentMessage;

    const consumersStats = [];
    for (let i = 0; i < 5; i++) {
      consumersStats.push(0);
      const index = i;
      simpleMQAdapter.consume('somequeue', (message, ack) => {
        expect(message).toBe(currentMessage);
        ack();
        consumersStats[index]++;
      });
    }

    for (let iteration = 0; iteration < 5000; iteration++) {
      currentMessage = `somemessage${iteration}`;
      simpleMQAdapter.publish('somequeue', currentMessage);
    }

    consumersStats.forEach((consumerStats) => {
      expect(Math.abs(consumerStats - 1000)).toBeLessThan(100);
    });
  });

  it('should re-publish if nack is called', (done) => {
    const simpleMQAdapter = new SimpleMQAdapter();

    let publishCounter = 0;

    simpleMQAdapter.consume('somequeue', (message, ack, nack) => {
      expect(message).toBe('somemessage');
      publishCounter++;
      if (publishCounter === 3) {
        ack();
        expect(publishCounter).toBe(3);
        done();
      } else {
        nack();
      }
    });

    simpleMQAdapter.publish('somequeue', 'somemessage');
  });

  it('should throw error if message is already acked', (done) => {
    const simpleMQAdapter = new SimpleMQAdapter();

    simpleMQAdapter.consume('somequeue', (message, ack, nack) => {
      expect(message).toBe('somemessage');
      ack();
      expect(() => ack()).toThrow('The message is already acked');
      expect(() => nack()).toThrow('The message is already acked');
      done();
    });

    simpleMQAdapter.publish('somequeue', 'somemessage');
  });

  it('should throw error if message is already nacked', (done) => {
    const simpleMQAdapter = new SimpleMQAdapter();

    let publishCounter = 0;

    simpleMQAdapter.consume('somequeue', (message, ack, nack) => {
      expect(message).toBe('somemessage');
      publishCounter++;
      if (publishCounter === 1) {
        nack();
        expect(() => ack()).toThrow('The message is already nacked');
        expect(() => nack()).toThrow('The message is already nacked');
        done();
      } else {
        ack();
      }
    });

    simpleMQAdapter.publish('somequeue', 'somemessage');
  });

  it('should throw error if consumer has unsubscribed', (done) => {
    const simpleMQAdapter = new SimpleMQAdapter();

    const subscription = simpleMQAdapter.consume(
      'somequeue',
      (message, ack, nack) => {
        expect(message).toBe('somemessage');
        subscription.unsubscribe();
        expect(() => ack()).toThrow('The consumer is already unsubscribed');
        expect(() => nack()).toThrow('The consumer is already unsubscribed');
        done();
      }
    );

    simpleMQAdapter.publish('somequeue', 'somemessage');
  });

  it('should hold messages for new subscribers', (done) => {
    const simpleMQAdapter = new SimpleMQAdapter();

    simpleMQAdapter.publish('somequeue', 'somemessage');

    const subscription = simpleMQAdapter.consume('somequeue', (message) => {
      expect(message).toBe('somemessage');
      process.nextTick(() => {
        subscription.unsubscribe();

        simpleMQAdapter.consume('somequeue', (message, ack) => {
          expect(message).toBe('somemessage');
          ack();
          done();
        });
      });
    });
  });

  it('should throw error if consumer unsubscribe twice', () => {
    const simpleMQAdapter = new SimpleMQAdapter();

    const subscription = simpleMQAdapter.consume('somequeue', () => {
      throw new Error('Should not receive message');
    });

    subscription.unsubscribe();

    expect(() => subscription.unsubscribe()).toThrow(
      'The consumer is already unsubscribed'
    );

    simpleMQAdapter.publish('somequeue', 'somemessage');
  });
});
