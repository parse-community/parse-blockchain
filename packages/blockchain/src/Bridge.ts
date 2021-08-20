import { Parse } from 'parse/node';
import * as triggers from 'parse-server/lib/triggers';
import { BlockchainStatus } from './types';
import MQAdapter from './MQAdapter';
import SimpleMQAdapter from './SimpleMQAdapter';

const maybeRunTrigger = triggers.maybeRunTrigger;

export default class Bridge {
  private initialized = false;
  private classNames: string[];
  private mqAdapter: MQAdapter;

  initialize(classNames: string[], mqAdapter?: MQAdapter): void {
    if (this.initialized) {
      throw new Error('The bridge is already initialized');
    } else {
      this.initialized = true;
    }

    this.classNames = classNames;
    this.mqAdapter = mqAdapter || new SimpleMQAdapter();

    triggers.maybeRunTrigger = this.handleMaybeRunTrigger.bind(this);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleMaybeRunTrigger(...args: any[]) {
    const [triggerType, { isMaster }, parseObject, originalParseObject] = args;

    if (
      triggerType === triggers.Types.beforeSave &&
      this.classNames.includes(parseObject.className)
    ) {
      if (originalParseObject) {
        if (
          !isMaster ||
          ((originalParseObject.get('blockchainStatus') !== undefined ||
            parseObject.get('blockchainStatus') !== BlockchainStatus.Sending ||
            parseObject.dirtyKeys().filter((key) => key !== 'blockchainStatus')
              .length > 0) &&
            (originalParseObject.get('blockchainStatus') !==
              BlockchainStatus.Sending ||
              ![BlockchainStatus.Sent, BlockchainStatus.Failed].includes(
                parseObject.get('blockchainStatus')
              ) ||
              parseObject
                .dirtyKeys()
                .filter(
                  (key) =>
                    !['blockchainStatus', 'blockchainResult'].includes(key)
                ).length > 0))
        ) {
          throw new Parse.Error(
            Parse.Error.OPERATION_FORBIDDEN,
            'unauthorized: cannot update objects on blockchain bridge'
          );
        }
      } else {
        if (parseObject.get('blockchainStatus') !== undefined) {
          throw new Parse.Error(
            Parse.Error.OPERATION_FORBIDDEN,
            'unauthorized: cannot set blockchainStatus field'
          );
        } else if (parseObject.get('blockchainResult') !== undefined) {
          throw new Parse.Error(
            Parse.Error.OPERATION_FORBIDDEN,
            'unauthorized: cannot set blockchainResult field'
          );
        }
      }
    } else if (
      triggerType === triggers.Types.afterSave &&
      !originalParseObject &&
      this.classNames.includes(parseObject.className)
    ) {
      this.mqAdapter.publish(
        `${Parse.applicationId}-parse-server-blockchain`,
        JSON.stringify(parseObject._toFullJSON())
      );
    } else if (
      triggerType === triggers.Types.beforeDelete &&
      this.classNames.includes(parseObject.className)
    ) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'unauthorized: cannot delete objects on blockchain bridge'
      );
    }

    return maybeRunTrigger(...args);
  }
}
