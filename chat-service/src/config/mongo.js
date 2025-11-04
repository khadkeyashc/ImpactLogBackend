const mongoose = require('mongoose');

let connected = false;

async function connectMongo() {
  if (connected) return mongoose.connection;
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ImpactLog';
  const opts = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  };
  await mongoose.connect(uri, opts);
  connected = true;
  console.log(`✅ Connected to MongoDB at ${uri}`);
  return mongoose.connection;
}

async function disconnectMongo() {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
  console.log('🛑 MongoDB connection closed');
}

module.exports = { connectMongo, disconnectMongo };
