export type Listener = (
  message: string,
  ack: () => void,
  nack: () => void
) => void;

export interface Subscription {
  unsubscribe: () => void;
}

export default interface MQAdapter {
  publish: (queue: string, message: string) => void;
  consume: (queue: string, listener: Listener) => Subscription;
}
