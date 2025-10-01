import mongoose from 'mongoose';

const { Schema } = mongoose;

const MovieSchema = new Schema({
  title: { type: String, required: false },
  description: { type: String, required: false },
  year: { type: Number, required: false },
  genres: { type: [String], required: false, default: [] },
  status: { type: String, required: true, default: 'Draft' },
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
  isAIGenerated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Movie =
  mongoose.models.Movie || mongoose.model('Movie', MovieSchema);
