# AI-Worker Refactoring Plan

This document outlines the plan to refactor the `ai-engine` into a microservice named `ai-worker`, following the structure of the existing `thumbnail-worker`.

## 1. Create `ai-worker` Service Directory

- Create a new directory: `services/ai-worker`
- Copy the following files from `services/thumbnail-worker` to `services/ai-worker`:
  - `.dockerignore`
  - `.env.example`
  - `Dockerfile`
  - `jest.config.js`
  - `package.json`
  - `tsconfig.json`
  - `.eslintrc.js`

## 2. Update `package.json`

- Change the `name` property in `package.json` to `"ai-worker"`.
- Add the following dependencies from `apps/frontend/package.json` to the `dependencies` section of `services/ai-worker/package.json`:
  - `@google-cloud/text-to-speech`
  - `fluent-ffmpeg`
  - `zod`
  - `genkit`
  - `@genkit-ai/vertexai`
  - `data-urls`
  - `uuid`
- Add `@types/uuid` to `devDependencies`.

## 3. Create Source Files

Create the following directory structure and files inside `services/ai-worker/src`:

```
src/
├── adapters/
│   └── ai.media-processor.ts
├── config/
│   ├── di.config.ts
│   └── index.ts
├── entities/
│   └── errors.entity.ts
├── use-cases/
│   └── ai-processing.usecase.ts
└── main.ts
```

## 4. Implement the `ai-worker`

### `config/index.ts`

- Create a Zod schema for the `ai-worker` configuration.
- It should include `NODE_ENV`, `RABBITMQ_URL`, `MONGO_URL`, `OUTPUT_DIR`, and a new `AI_QUEUE` variable.
- Add `GOOGLE_API_KEY` and `GOOGLE_APPLICATION_CREDENTIALS`.

### `main.ts`

- This will be the entry point for the worker.
- It will set up DI, connect to MongoDB and RabbitMQ.
- It will consume messages from the queue specified by `AI_QUEUE`.
- When a message is received, it will resolve `AIProcessingUseCase` from the container and execute it.
- It will handle success and failure cases, publishing `task_completed` or `task_failed` messages.

### `adapters/ai.media-processor.ts`

- This file will contain the core AI processing logic.
- Create a class `AIMediaProcessor` that implements the `IMediaProcessor` interface.
- Move the entire logic from `apps/frontend/src/lib/media/engines/ai-engine.ts` into this class.
- The `process` method of `AIEngine` will become the `process` method of `AIMediaProcessor`.
- All helper methods (`_constructChaptersVtt`, `_generateTTSAudio`, etc.) will become private methods of this class.
- The `Genkit` flows from `apps/frontend/src/lib/ai/flow.ts` will be moved inside this adapter or a separate `flow.ts` file within the `ai-worker` service. For simplicity, they can be part of the `AIMediaProcessor` initially.
- The `AIEngineOutput` will be adapted to match the `WorkerOutput` structure.

### `use-cases/ai-processing.usecase.ts`

- Create a class `AIProcessingUseCase`.
- It will be injectable and will receive `ITaskRepository`, `IMediaProcessor`, and `ISourceResolver` in its constructor.
- The `execute` method will take `jobId`, `taskId`, and `sourceUrl` as input.
- It will update the task status to 'running'.
- It will call `this.mediaProcessor.process()`.
- On success, it will update the task output and set the status to 'completed'.
- On error, it will fail the task.

### `config/di.config.ts`

- Set up the dependency injection using `tsyringe`.
- Register `MongoDbConnection` for `DI_TOKENS.DatabaseConnection`.
- Register `RabbitMQAdapter` for `IMessageConsumer` and `IMessagePublisher`.
- Register `MongoTaskRepository` for `DI_TOKENS.TaskRepository`.
- Register `FsSourceResolver` for `DI_TOKENS.SourceResolver`.
- Register `AIMediaProcessor` for `DI_TOKENS.MediaProcessor`.

## 5. Update Dockerfile and Environment

- **`Dockerfile`**:
  - Update the `CMD` to run the `ai-worker`.
  - Ensure that any system-level dependencies (like `ffmpeg` and any dependencies for the vocal remover) are installed.
  - The `vocal_remover.exe` and its models need to be copied into the Docker image. A `bin` directory should be created in the `ai-worker` service.
- **`.env.example`**:
  - Add `AI_QUEUE`, `GOOGLE_API_KEY`, and `GOOGLE_APPLICATION_CREDENTIALS` to the example environment file.

## 6. Frontend Changes (Post-Refactor)

- The code in the frontend that currently instantiates and calls `AIEngine` will need to be changed to publish a message to the `ai-jobs` queue via an API call to the backend, which will then add the job to the queue.
