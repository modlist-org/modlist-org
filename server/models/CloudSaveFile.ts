import mongoose from 'mongoose'
import type { Types, Model } from 'mongoose'
const { Schema, model, models } = mongoose

export interface ICloudSaveFile {
  _id: Types.ObjectId
  userId: Types.ObjectId
  game: 'adofai' | 'rhythm-doctor' | 'dancing-line'
  fileKey: string
  fileName: string
  fileSize: number
  updatedAt: Date
}

const CloudSaveFileSchema = new Schema<ICloudSaveFile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  game: { type: String, required: true, enum: ['adofai', 'rhythm-doctor', 'dancing-line'], index: true },
  fileKey: { type: String, required: true, unique: true, index: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now }
})

export const CloudSaveFile: Model<ICloudSaveFile> = models.CloudSaveFile || model<ICloudSaveFile>('CloudSaveFile', CloudSaveFileSchema)
