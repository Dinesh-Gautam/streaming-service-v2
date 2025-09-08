import amqp, { Channel, ConsumeMessage } from 'amqplib';
import { singleton } from 'tsyringe';

import type { ChannelModel } from 'amqplib';

export { MockMessageQueue } from './mock';

export interface IMessageQueue {
  connect(rabbitmqUrl?: string): Promise<void>;
  ack(msg: ConsumeMessage): Promise<void>;
  nack(msg: ConsumeMessage, requeue?: boolean): Promise<void>;
  close(): Promise<void>;
  getChannel(): Channel;
}

// Define worker types
export type WorkerTypes = 'thumbnail' | 'transcode';

// Define outputs
export interface ThumbnailOutput {
  paths: {
    vtt: string;
    thumbnailsDir: string;
  };
}

export interface TranscodingOutput {
  test: boolean;
}

// Map worker -> output type
export type WorkerOutputs = {
  thumbnail: ThumbnailOutput;
  transcode: TranscodingOutput;
};

// Message queue channels
export const MessageQueueChannels = {
  thumbnail: 'thumbnail_tasks',
  transcode: 'transcode_tasks',
  completed: 'task_completed',
  failed: 'task_failed',
} as const;

export type QueueChannels =
  (typeof MessageQueueChannels)[keyof typeof MessageQueueChannels];

// Base messages
export type TaskCompletedMessage<T extends WorkerTypes> = {
  jobId: string;
  taskId: string;
  taskType: T;
  output: WorkerOutputs[T];
};

export type TaskFailedMessage = {
  jobId: string;
  taskId: string;
};

// Worker messages by channel
export type WorkerMessages = {
  thumbnail_tasks: {
    jobId: string;
    taskId: string;
    sourceUrl: string;
  };
  transcode_tasks: {
    jobId: string;
    taskId: string;
    sourceUrl: string;
  };
  task_completed: TaskCompletedMessage<WorkerTypes>;
  task_failed: TaskFailedMessage;
};

type Channels =
  (typeof MessageQueueChannels)[keyof typeof MessageQueueChannels];

// Generic worker output wrapper
export type WorkerOutput<T> = {
  success: boolean;
  output: T;
};

// Publisher interface
export interface IMessagePublisher extends IMessageQueue {
  publish<C extends Channels>(
    queue: C,
    message: WorkerMessages[C],
  ): Promise<void>;
}

export interface IMessageConsumer extends IMessageQueue {
  consume<C extends Channels>(
    queue: C,
    onMessageCb: (
      content: WorkerMessages[C] | null,
      msg: ConsumeMessage | null,
    ) => void,
  ): Promise<void>;
}

@singleton()
export class RabbitMQAdapter implements IMessagePublisher, IMessageConsumer {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  public async connect(rabbitmqUrl?: string): Promise<void> {
    if (this.connection) {
      return;
    }

    const url = rabbitmqUrl || process.env.RABBITMQ_URL || 'amqp://localhost';
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      console.log('Successfully connected to RabbitMQ.');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ', error);
      throw error;
    }
  }

  async ack(msg: ConsumeMessage): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available.');
    }
    this.channel.ack(msg);
  }

  async nack(msg: ConsumeMessage, requeue = false): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available.');
    }
    this.channel.nack(msg, false, requeue);
  }

  async publish(
    queue: Channels,
    message: WorkerMessages[Channels],
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available.');
    }
    await this.channel.assertQueue(queue, { durable: true });
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
  }

  async consume<C extends Channels>(
    queue: C,
    onMessageCb: (
      content: WorkerMessages[C] | null,
      msg: ConsumeMessage | null,
    ) => void,
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available.');
    }
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.consume(
      queue,
      (msg) => onMessageCb(msg && JSON.parse(msg.content.toString()), msg),
      { noAck: false },
    );
  }

  public getChannel(): Channel {
    if (!this.channel) {
      throw new Error(
        'RabbitMQ channel is not available. Call connect() first.',
      );
    }
    return this.channel;
  }

  public async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
      this.channel = null;
      console.log('RabbitMQ connection closed.');
    }
  }
}
