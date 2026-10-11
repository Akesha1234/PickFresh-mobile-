const mongoose = require('mongoose');

const DEFAULT_ATLAS_URI = 'mongodb+srv://rehanahashni2001_db_user:r6CuFSozjBxMKGX9@cluster0.tm1cjxu.mongodb.net/pickfresh_db?retryWrites=true&w=majority';

// Global cached connection across serverless invocations
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', false);
    const uri = process.env.MONGODB_URI || DEFAULT_ATLAS_URI;

    const opts = {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      bufferCommands: true,
      maxPoolSize: 10
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log(`✅ MongoDB Atlas Connected: ${mongooseInstance.connection.host}`);
      return mongooseInstance;
    }).catch((err) => {
      cached.promise = null;
      console.error(`⚠️ MongoDB Connection Error: ${err.message}`);
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
};

module.exports = connectDB;
