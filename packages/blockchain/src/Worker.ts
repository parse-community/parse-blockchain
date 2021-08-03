import { Parse } from 'parse/node';
import BlockchainAdapter from './BlockchainAdapter';
import MQAdapter from './MQAdapter';
import SimpleMQAdapter from './SimpleMQAdapter';

export default class Worker {
  private initialized = false;
  private blockchainAdapter: BlockchainAdapter;
  private mqAdapter: MQAdapter;

  initialize(
    blockchainAdapter: BlockchainAdapter,
    mqAdapter?: MQAdapter
  ): void {
    if (this.initialized) {
      throw new Error('The worker is already initialized');
    } else {
      this.initialized = true;
    }

    this.blockchainAdapter = blockchainAdapter;

    this.mqAdapter = mqAdapter || new SimpleMQAdapter();

    this.subscribe();
  }

  private subscribe() {
    this.mqAdapter.consume(
      `${Parse.applicationId}-parse-server-blockchain`,
      this.handleMessage.bind(this)
    );
  }

  private async handleMessage(
    message: string,
    ack: () => void,
    nack: () => void
  ) {
    const parseObjectFullJSON = JSON.parse(message);

    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * i));
      try {
        this.blockchainAdapter.send(parseObjectFullJSON);
      } catch (e) {
        console.error('Could not send object', parseObjectFullJSON, e);
        continue;
      }
      ack();
      return;
    }

    nack();
  }
}
