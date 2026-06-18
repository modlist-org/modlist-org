import mongoose from 'mongoose'
import type { Types, Model } from 'mongoose'
const { Schema, model, models } = mongoose

export interface IPresetMod {
  slug: string
  version: string
  isEnabled: boolean
}

export interface IModPreset {
  _id: string // 8-character randomized ID
  ownerId: Types.ObjectId
  name: string
  game: 'adofai' | 'rhythm-doctor' | 'dancing-line'
  mods: IPresetMod[]
  createdAt: Date
}

const PresetModSchema = new Schema<IPresetMod>({
  slug: { type: String, required: true },
  version: { type: String, required: true },
  isEnabled: { type: Boolean, default: true }
}, { _id: false })

const ModPresetSchema = new Schema<IModPreset>({
  _id: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  game: { type: String, required: true, enum: ['adofai', 'rhythm-doctor', 'dancing-line'], index: true },
  mods: [PresetModSchema],
  createdAt: { type: Date, default: Date.now }
})

export const ModPreset: Model<IModPreset> = models.ModPreset || model<IModPreset>('ModPreset', ModPresetSchema)
