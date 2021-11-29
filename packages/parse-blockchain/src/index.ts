import Bridge from './Bridge';
import Worker from './Worker';

export * from './types';

export { default as BlockchainAdapter } from './BlockchainAdapter';

export { default as MQAdapter } from './MQAdapter';
export * from './MQAdapter';

export { default as SimpleMQAdapter } from './SimpleMQAdapter';

export const bridge = new Bridge();

export const worker = new Worker();
