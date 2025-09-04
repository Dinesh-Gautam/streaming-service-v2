import type { IMessageConsumer, IMessagePublisher } from './index';

export class MockMessageQueue implements IMessagePublisher, IMessageConsumer {
  connect = jest.fn().mockResolvedValue(undefined);
  consume = jest.fn().mockResolvedValue(undefined);
  publish = jest.fn().mockResolvedValue(undefined);
  ack = jest.fn().mockResolvedValue(undefined);
  nack = jest.fn().mockResolvedValue(undefined);
  close = jest.fn().mockResolvedValue(undefined);
  getChannel = jest.fn().mockReturnValue(null);
}
