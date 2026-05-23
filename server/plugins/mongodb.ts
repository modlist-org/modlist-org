import mongoose from 'mongoose'

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  const uri = config.mongodbUri

  if (!uri) {
    console.error('ERROR: MONGODB_URI is not defined in runtime config or env variables!')
    return
  }

  try {
    // Enable strictQuery if needed, but defaults are fine.
    mongoose.set('strictQuery', false)
    await mongoose.connect(uri)
    console.log('Successfully connected to MongoDB via Mongoose')
  } catch (err) {
    console.error('Mongoose connection error:', err)
  }
})
