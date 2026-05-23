import mongoose from 'mongoose'
import type { Types, Model } from 'mongoose'
const { Schema, model, models } = mongoose

export interface IPendingModEdit {
  name?: string
  summary?: string
  description?: string
  game?: 'adofai' | 'rhythm-doctor'
  categories?: Array<'ui' | 'gameplay' | 'utility' | 'visuals' | 'library'>
  logo?: string
  sourceUrl?: string
  createdAt?: Date
}

export interface IModVersion {
  _id?: Types.ObjectId
  version: string
  downloadUrl: string
  changelog: string
  gameVersion?: string
  isApproved: boolean
  rejectionReason?: string
  submittedBy: Types.ObjectId
  createdAt: Date
}

export interface IMod {
  _id: string
  name: string
  slug: string
  summary: string
  description: string
  game: 'adofai' | 'rhythm-doctor'
  categories: Array<'ui' | 'gameplay' | 'utility' | 'visuals' | 'library'>
  authorId: Types.ObjectId
  collaboratorIds: Types.ObjectId[]
  pendingCollaboratorIds: Types.ObjectId[]
  pendingEdit?: IPendingModEdit | null
  isApproved: boolean
  rejectionReason?: string
  editRejectionReason?: string
  logo?: string
  sourceUrl?: string
  downloads: number
  versions: IModVersion[]
  isFeatured?: boolean
  createdAt: Date
  updatedAt: Date
}

const ModVersionSchema = new Schema<IModVersion>({
  version: { type: String, required: true },
  downloadUrl: { type: String, required: true },
  changelog: { type: String, default: '' },
  gameVersion: { type: String, default: '' },
  isApproved: { type: Boolean, default: false, index: true },
  rejectionReason: { type: String, default: '' },
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
})

const PendingModEditSchema = new Schema<IPendingModEdit>({
  name: { type: String },
  summary: { type: String },
  description: { type: String },
  game: { type: String, enum: ['adofai', 'rhythm-doctor'] },
  categories: [{ type: String, enum: ['ui', 'gameplay', 'utility', 'visuals', 'library'] }],
  logo: { type: String },
  sourceUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
})

const ModSchema = new Schema<IMod>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true, index: true },
  summary: { type: String, required: true },
  description: { type: String, default: '' },
  game: { type: String, required: true, enum: ['adofai', 'rhythm-doctor'], index: true },
  categories: [{ type: String, enum: ['ui', 'gameplay', 'utility', 'visuals', 'library'], index: true, default: ['ui'] }],
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  collaboratorIds: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
  pendingCollaboratorIds: [{ type: Schema.Types.ObjectId, ref: 'User', index: true, default: [] }],
  pendingEdit: { type: PendingModEditSchema, default: null },
  isApproved: { type: Boolean, default: false, index: true },
  rejectionReason: { type: String, default: '' },
  editRejectionReason: { type: String, default: '' },
  logo: { type: String, default: '' },
  sourceUrl: { type: String, default: '' },
  downloads: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false, index: true },
  versions: [ModVersionSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

export const Mod: Model<IMod> = models.Mod || model<IMod>('Mod', ModSchema)
