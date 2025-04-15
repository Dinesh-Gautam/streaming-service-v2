import mongoose, { Document, Schema, Types } from 'mongoose';

import { EngineTaskOutput } from '@/lib/media/engine-outputs'; // Import the output union type

// Interface for individual task status within a job
export interface IMediaProcessingTask extends Document {
  taskId: string; // Unique identifier for the task within the job (e.g., 'thumbnails', 'transcode-dash')
  engine: string; // Name of the engine used (e.g., 'ThumbnailEngine', 'TranscodingEngine')
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // Percentage (0-100)
  errorMessage?: string;
  startTime?: Date;
  endTime?: Date;
  output?: EngineTaskOutput; // Use the specific union type for output
}

// Interface for the overall media processing job
export interface IMediaProcessingJob extends Document {
  mediaId: string; // Identifier linking to the original media (e.g., Movie._id.toString())
  jobStatus: 'pending' | 'running' | 'completed' | 'failed';
  tasks: IMediaProcessingTask[];
  createdAt: Date;
  updatedAt: Date;
}

const MediaProcessingTaskSchema = new Schema<IMediaProcessingTask>(
  {
    taskId: { type: String, required: true },
    engine: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      required: true,
      default: 'pending',
    },
    progress: { type: Number, required: true, default: 0, min: 0, max: 100 },
    errorMessage: { type: String },
    startTime: { type: Date },
    endTime: { type: Date },
    output: { type: Schema.Types.Mixed }, // Keep Mixed for Mongoose flexibility, but TS uses EngineTaskOutput
  },
  { _id: false }, // Don't create separate _id for subdocuments
);

const MediaProcessingJobSchema = new Schema<IMediaProcessingJob>(
  {
    mediaId: { type: String, required: true, index: true },
    jobStatus: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      required: true,
      default: 'pending',
    },
    tasks: [MediaProcessingTaskSchema], // Array of tasks
  },
  { timestamps: true }, // Automatically add createdAt and updatedAt
);

// Ensure model is not recompiled by Next.js hot reload
export const MediaProcessingJob =
  mongoose.models.MediaProcessingJob ||
  mongoose.model<IMediaProcessingJob>(
    'MediaProcessingJob',
    MediaProcessingJobSchema,
  );
