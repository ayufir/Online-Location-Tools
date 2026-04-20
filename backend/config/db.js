const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/solartrack_pro';
  let retries = 5;

  while (retries > 0) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log('✅ MongoDB connected successfully');
      console.log(`   📦 Database: ${mongoose.connection.name}`);
      break;
    } catch (err) {
      retries -= 1;
      console.error(`❌ MongoDB connection failed. Retries left: ${retries}`);
      if (retries === 0) {
        console.error('   MongoDB is not running. Please start MongoDB and try again.');
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, 3000));
    }
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected. Attempting reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
  });
};

module.exports = connectDB;
