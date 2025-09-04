import amqp, { Channel, ConsumeMessage } from 'amqplib';
import { singleton } from 'tsyringe';

import type { ChannelModel } from 'amqplib';

export interface IMessageQueue {
  connect(rabbitmqUrl?: string): Promise<void>;
  ack(msg: ConsumeMessage): Promise<void>;
  nack(msg: ConsumeMessage): Promise<void>;
  close(): Promise<void>;
  getChannel(): Channel;
}

export interface IMessagePublisher extends IMessageQueue {
  publish(queue: string, message: any): Promise<void>;
}

export interface IMessageConsumer extends IMessageQueue {
  consume(
    queue: string,
    onMessage: (msg: ConsumeMessage | null) => void,
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

  async nack(msg: ConsumeMessage): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available.');
    }
    this.channel.nack(msg);
  }

  async publish(queue: string, message: any): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available.');
    }
    await this.channel.assertQueue(queue, { durable: true });
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
  }

  async consume(
    queue: string,
    onMessage: (msg: ConsumeMessage | null) => void,
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available.');
    }
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.consume(queue, onMessage, { noAck: false });
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
