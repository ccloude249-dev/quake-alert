import mongoose from 'mongoose';

export async function connectDb(uri) {
  if (!uri) { console.warn('[db] sin MONGODB_URI — modo sin persistencia'); return null; }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log('[db] MongoDB conectado');
  return mongoose.connection;
}
