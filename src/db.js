import mongoose from 'mongoose';
import { logger } from './logger.js';

export const connectDB = async () => {
  try {
    logger.info('Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      family: 4, 
      serverSelectionTimeoutMS: 5000, // Fails after 5 seconds instead of hanging
      connectTimeoutMS: 10000,
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('CRITICAL MONGODB ERROR:', error);
    process.exit(1);
  }
};