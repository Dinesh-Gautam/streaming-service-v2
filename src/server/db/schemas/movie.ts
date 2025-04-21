import mongoose from 'mongoose';

const { Schema } = mongoose;

const videoTranscodingProgressSchema = new Schema({
  videoId: { type: String, required: true },
  progress: { type: Number, required: true },
  error: { type: Boolean },
  errorMessage: { type: String },
});

const MovieSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  year: { type: Number, required: true },
  genres: { type: [String], requried: true }, // Changed to array of strings with default empty array
  status: { type: String, required: true },
  media: {
    video: {
      originalPath: { type: String },
      id: { type: String },
    },
    poster: {
      originalPath: { type: String },
      id: { type: String },
    },
    backdrop: {
      originalPath: { type: String },
      id: { type: String },
    },
  },
  isAIGenerated: { type: Boolean, default: false }, // Add the new field
  createdAt: { type: Date, default: Date.now },
});

export const TranscodingProgress =
  mongoose.models.TranscodingProgress ||
  mongoose.model('TranscodingProgress', videoTranscodingProgressSchema);

export const Movie =
  mongoose.models.Movie || mongoose.model('Movie', MovieSchema);
