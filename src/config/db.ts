import mongoose from 'mongoose'
import { config } from './env.js'

export async function connectDB(): Promise<typeof mongoose> {
  try {
    mongoose.set('strictQuery', true)
    const conn = await mongoose.connect(config.MONGODB_URI)
    console.log(`📡 MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`)
    return conn
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error)
    process.exit(1)
  }
}
