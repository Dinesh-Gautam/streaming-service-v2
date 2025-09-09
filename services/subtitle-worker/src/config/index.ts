import 'reflect-metadata';

import dotenv from 'dotenv';

dotenv.config();

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || '3003',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://rabbitmq',
  subtitleQueue: process.env.SUBTITLE_QUEUE || 'subtitle-jobs',
  mongoUrl: process.env.MONGO_URL || 'mongodb://mongo:27017',
  mongoDbName: process.env.MONGO_DB_NAME || 'media-jobs',
  deepgramApiKey: process.env.DEEPGRAM_API_KEY,
  googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
};

// Basic validation
if (!config.deepgramApiKey) {
  throw new Error('DEEPGRAM_API_KEY is a required environment variable.');
}

export default config;
