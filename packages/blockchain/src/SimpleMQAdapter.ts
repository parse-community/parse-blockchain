import MQAdapter, { Listener, Subscription } from './MQAdapter';

export default class SimpleMQAdapter implements MQAdapter {
  private queuesState: {
    [queue: string]: {
      consumers: {
        listener: Listener;
        deliveredMessages: string[];
      }[];
      notDeliveredMessages: string[];
    };
  } = {};

  private ensureQueue(queue: string) {
    if (!this.queuesState[queue]) {
      this.queuesState[queue] = {
        consumers: [],
        notDeliveredMessages: [],
      };
    }
  }

  publish(queue: string, message: string): void {
    this.ensureQueue(queue);

    if (this.queuesState[queue].consumers.length > 0) {
      const consumer =
        this.queuesState[queue].consumers[
          Math.floor(Math.random() * this.queuesState[queue].consumers.length)
        ];

      consumer.deliveredMessages.push(message);

      let acked = false;
      let nacked = false;
      const validateACK = () => {
        if (acked) {
          throw new Error('The message is already acked');
        } else if (nacked) {
          throw new Error('The message is already nacked');
        } else if (this.queuesState[queue].consumers.indexOf(consumer) < 0) {
          throw new Error('The consumer is already unsubscribed');
        }
      };

      const removeFromDeliveredMessages = () => {
        const index = consumer.deliveredMessages.indexOf(message);
        consumer.deliveredMessages.splice(index, 1);
      };

      consumer.listener(
        message,
        () => {
          validateACK();
          acked = true;
          removeFromDeliveredMessages();
        },
        () => {
          validateACK();
          nacked = true;
          removeFromDeliveredMessages();
          process.nextTick(() => {
            this.publish(queue, message);
          });
        }
      );
    } else {
      this.queuesState[queue].notDeliveredMessages.push(message);
    }
  }

  consume(queue: string, listener: Listener): Subscription {
    this.ensureQueue(queue);

    const consumer = {
      listener,
      deliveredMessages: [],
    };
    this.queuesState[queue].consumers.push(consumer);

    process.nextTick(() => {
      this.queuesState[queue].notDeliveredMessages
        .splice(0, this.queuesState[queue].notDeliveredMessages.length)
        .forEach((notDeliveredMessage) =>
          this.publish(queue, notDeliveredMessage)
        );
    });

    return {
      unsubscribe: () => {
        const index = this.queuesState[queue].consumers.indexOf(consumer);
        if (index < 0) {
          throw new Error('The consumer is already unsubscribed');
        } else {
          this.queuesState[queue].consumers.splice(index, 1);
        }

        process.nextTick(() => {
          consumer.deliveredMessages.forEach((deliveredMessage) =>
            this.publish(queue, deliveredMessage)
          );
        });
      },
    };
  }
}
