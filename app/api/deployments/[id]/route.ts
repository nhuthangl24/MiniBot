import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import DockerService from '@/services/docker/DockerService'
import { connectToDatabase } from '@/lib/db'
import Deployment from '@/models/Deployment'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params;
    const { action } = await req.json()
    await connectToDatabase()
    
    const deployment = await Deployment.findOne({ _id: id, userId: (session.user as any).id })
    if (!deployment || !deployment.containerId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const docker = DockerService.getInstance()
    
    if (action === 'stop') {
      await docker.stopContainer(deployment.containerId)
      deployment.status = 'stopped'
    } else if (action === 'start' || action === 'restart') {
      if (action === 'restart') {
        const container = docker.getDocker().getContainer(deployment.containerId)
        await container.stop().catch(() => {})
      }
      const container = docker.getDocker().getContainer(deployment.containerId)
      await container.start()
      deployment.status = 'running'
    }

    await deployment.save()
    return NextResponse.json({ success: true, status: deployment.status })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params;
    await connectToDatabase()
    
    const deployment = await Deployment.findById(id)
    if (!deployment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (deployment.containerId) {
       const docker = DockerService.getInstance()
       await docker.deleteContainer(deployment.containerId).catch(() => {})
    }

    await Deployment.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
