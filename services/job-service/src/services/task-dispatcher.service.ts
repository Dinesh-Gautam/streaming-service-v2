import { inject, injectable } from 'tsyringe';

import type { QueueChannels } from '@monorepo/message-queue';

import { DI_TOKENS, MediaTask } from '@monorepo/core';
import {
  IMessagePublisher,
  MessageQueueChannels,
} from '@monorepo/message-queue';
import { WorkerMessages } from '@monorepo/workers';

type TaskMessages = WorkerMessages[keyof Omit<
  WorkerMessages,
  'task_completed' | 'task_failed'
>];

@injectable()
export class TaskDispatcher {
  constructor(
    @inject(DI_TOKENS.MessagePublisher)
    private messagePublisher: IMessagePublisher,
  ) {}

  async dispatch(task: MediaTask, payload: TaskMessages): Promise<void> {
    const worker = task.worker;

    await this.messagePublisher.publish(MessageQueueChannels[worker], payload);
  }
}
