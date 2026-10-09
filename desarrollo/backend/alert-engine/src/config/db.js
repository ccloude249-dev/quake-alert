import mongoose from 'mongoose';

/**
 * Conecta a MongoDB. Si no hay URI, el servicio sigue vivo sin persistencia
 * (útil para demos y para arrancar antes de aprovisionar la base).
 */
export async function connectDb(uri) {
  if (!uri) {
    console.warn('[db] MONGODB_URI no definido — corriendo SIN persistencia');
    return null;
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log('[db] MongoDB conectado');
  return mongoose.connection;
}
