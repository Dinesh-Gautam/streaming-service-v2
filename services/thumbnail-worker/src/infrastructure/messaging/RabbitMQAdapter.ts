import { injectable } from 'tsyringe';

@injectable()
export class RabbitMQAdapter {
  async connect(): Promise<void> {
    console.log('Connecting to RabbitMQ...');
    // In a real implementation, you would connect to RabbitMQ here.
    return Promise.resolve();
  }

  async consume(
    queue: string,
    callback: (message: any) => void,
  ): Promise<void> {
    console.log(`Consuming messages from queue: ${queue}`);
    // In a real implementation, you would consume messages here.
    // For now, we'll just simulate a message.
    setTimeout(() => {
      callback({ id: 'mock-job-id', sourceUrl: 'mock-video.mp4' });
    }, 2000);
    return Promise.resolve();
  }
}
