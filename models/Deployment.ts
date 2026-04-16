import mongoose, { Schema, Document } from 'mongoose'

export interface IDeployment extends Document {
  userId: string
  name: string
  repoUrl: string
  containerId?: string
  status: 'deploying' | 'running' | 'stopped' | 'failed'
  image: string
  envType: string
  createdAt: Date
  startCommand?: string
}

const DeploymentSchema: Schema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  repoUrl: { type: String, required: true },
  containerId: { type: String },
  status: { type: String, default: 'deploying' },
  image: { type: String, required: true },
  envType: { type: String },
  createdAt: { type: Date, default: Date.now },
  startCommand: { type: String }
})

export default mongoose.models.Deployment || mongoose.model<IDeployment>('Deployment', DeploymentSchema)
