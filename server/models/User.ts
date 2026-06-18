import mongoose from 'mongoose'
import type { Model } from 'mongoose'
const { Schema, model, models } = mongoose

export interface IUser {
  _id: string
  discordId: string
  username: string
  globalName?: string
  avatar?: string
  isVerifiedDeveloper: boolean
  isAdmin: boolean
  premiumSavingUsedBytes?: number
  isPremium?: boolean
  premiumLastCheckedAt?: Date
  lastSyncedAt?: Date
  createdAt: Date
}

const UserSchema = new Schema<IUser>({
  discordId: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true },
  globalName: { type: String },
  avatar: { type: String },
  isVerifiedDeveloper: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  premiumSavingUsedBytes: { type: Number, default: 0 },
  isPremium: { type: Boolean, default: false, index: true },
  premiumLastCheckedAt: { type: Date },
  lastSyncedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
})

export const User: Model<IUser> = models.User || model<IUser>('User', UserSchema)
