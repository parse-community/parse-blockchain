import { BlockchainStatus } from './types';
import BlockchainAdapter from './BlockchainAdapter';
import MQAdapter from './MQAdapter';
import SimpleMQAdapter from './SimpleMQAdapter';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Parse = (global as any).Parse;

interface Options {
  waitSendingAttempts?: number;
  waitSendingSleepMS?: number;
}

export default class Worker {
  private initialized = false;
  private blockchainAdapter: BlockchainAdapter;
  private mqAdapter: MQAdapter;
  private fails = 0;
  private options: Options;

  initialize(
    blockchainAdapter: BlockchainAdapter,
    mqAdapter?: MQAdapter,
    options?: Options
  ): void {
    if (this.initialized) {
      throw new Error('The worker is already initialized');
    } else {
      this.initialized = true;
    }

    this.blockchainAdapter = blockchainAdapter;

    this.mqAdapter = mqAdapter || new SimpleMQAdapter();

    const defaultOptions = {
      waitSendingAttempts: 30, // ~30 mins
      waitSendingSleepMS: 60 * 1000, // 1 min
    };
    this.options = options || defaultOptions;
    this.options.waitSendingAttempts =
      this.options.waitSendingAttempts || defaultOptions.waitSendingAttempts;
    this.options.waitSendingSleepMS =
      this.options.waitSendingSleepMS || defaultOptions.waitSendingSleepMS;

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
    if (this.fails > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.fails * 1000));
    }

    const parseObjectFullJSON = JSON.parse(message);
    const { className, objectId } = parseObjectFullJSON;

    let blockchainStatus: BlockchainStatus;
    for (let i = 0; i < this.options.waitSendingAttempts; i++) {
      // ~30 mins
      try {
        blockchainStatus = await this.getStatus(className, objectId);
      } catch (e) {
        console.error('Could not get object status', parseObjectFullJSON, e);
        this.fails++;
        nack();
        return;
      }

      if (blockchainStatus) {
        console.warn(
          'Object already has blockchain status',
          parseObjectFullJSON,
          blockchainStatus
        );
        if (blockchainStatus === BlockchainStatus.Sending) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.options.waitSendingSleepMS)
          ); // 1 min
        } else {
          this.fails = 0;
          ack();
          return;
        }
      } else {
        break;
      }
    }

    let blockchainResult: Record<string, unknown>;
    if (blockchainStatus === BlockchainStatus.Sending) {
      try {
        blockchainResult = {
          type: 'Get',
          input: { className, objectId },
          output: await this.blockchainAdapter.get(className, objectId),
        };
        blockchainStatus = BlockchainStatus.Sent;
      } catch (e) {
        if (!/The object does not exist/.test(e)) {
          this.fails++;
          nack();
          return;
        }
      }
    } else {
      try {
        await this.updateStatus(className, objectId, BlockchainStatus.Sending);
        blockchainStatus = BlockchainStatus.Sending;
      } catch (e) {
        console.error(
          'Could not update object status',
          parseObjectFullJSON,
          BlockchainStatus.Sending,
          e
        );
        this.fails++;
        nack();
        return;
      }
    }

    if (blockchainStatus === BlockchainStatus.Sending) {
      try {
        blockchainResult = {
          type: 'Send',
          input: JSON.stringify(parseObjectFullJSON),
          output: await this.blockchainAdapter.send(parseObjectFullJSON),
        };
        blockchainStatus = BlockchainStatus.Sent;
      } catch (e) {
        console.error('Could not send object', parseObjectFullJSON, e);
        blockchainResult = {
          type: 'Error',
          input: JSON.stringify(parseObjectFullJSON),
          error: e.toString(),
        };
        blockchainStatus = BlockchainStatus.Failed;
      }
    }

    try {
      await this.updateStatus(
        className,
        objectId,
        blockchainStatus,
        blockchainResult
      );
      this.fails = 0;
    } catch (e) {
      console.error(
        'Could not update object status',
        parseObjectFullJSON,
        blockchainStatus,
        blockchainResult,
        e
      );
      this.fails++;
      nack();
      return;
    }

    ack();
  }

  private async getStatus(
    className: string,
    objectId: string
  ): Promise<BlockchainStatus | undefined | null> {
    const parseQuery = new Parse.Query(className);
    const parseObject = await parseQuery.get(objectId, { useMasterKey: true });
    return parseObject.get('blockchainStatus');
  }

  private updateStatus(
    className: string,
    objectId: string,
    blockchainStatus: BlockchainStatus | null,
    blockchainResult?: Record<string, unknown>
  ): Promise<void> {
    const parseObject = new Parse.Object(className);
    parseObject.id = objectId;
    parseObject.set('blockchainStatus', blockchainStatus);
    if (blockchainResult) {
      parseObject.set('blockchainResult', blockchainResult);
    }
    return parseObject.save(null, { useMasterKey: true });
  }
}
