import amqplib, { Channel, ChannelModel } from 'amqplib';
import { injectable } from 'tsyringe';

import { logger } from '@thumbnail-worker/infrastructure/logger';

@injectable()
export class RabbitMQAdapter {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  async connect(url: string): Promise<void> {
    try {
      this.connection = await amqplib.connect(url);
      this.channel = await this.connection.createChannel();
      logger.info('Connected to RabbitMQ');
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', error);
      throw error;
    }
  }

  async consume(
    queue: string,
    callback: (message: any) => void,
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available');
    }

    await this.channel.assertQueue(queue, { durable: true });
    this.channel.consume(queue, (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          callback(content);
          this.channel?.ack(msg);
        } catch (error) {
          logger.error('Error processing message:', error);
          this.channel?.nack(msg, false, false);
        }
      }
    });
  }

  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
    logger.info('RabbitMQ connection closed');
  }
}
