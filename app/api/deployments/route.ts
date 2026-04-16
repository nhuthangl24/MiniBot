import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import DockerService from '@/services/docker/DockerService'
import { connectToDatabase } from '@/lib/db'
import Deployment from '@/models/Deployment'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'

const execAsync = promisify(exec)

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { repoUrl, envType, startCommand, name } = await req.json()
    if (!repoUrl || !name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    await connectToDatabase()
    
    // Directory to store cloned code
    const cloneDir = path.join(process.cwd(), 'temp_clones', `${name}-${Date.now()}`)
    
    // Create status object in DB
    const deployment = await Deployment.create({
      userId: (session.user as any)?.id || session.user?.email,
      name,
      repoUrl,
      status: 'deploying',
      image: envType || 'node:18-alpine',
    })

    // Run deployment process in background
    deployBot(deployment._id, repoUrl, cloneDir, startCommand, envType, name).catch(console.error)

    return NextResponse.json({ success: true, deploymentId: deployment._id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function deployBot(deploymentId: string, repoUrl: string, cloneDir: string, startCommand: string, envType: string, botName: string) {
  const docker = DockerService.getInstance()
  const db = await connectToDatabase()
  
  try {
    // 1. Clone repository
    console.log(`Cloning ${repoUrl} to ${cloneDir}`)
    await execAsync(`git clone ${repoUrl} ${cloneDir}`)

    // 2. Generate Dockerfile if not exists
    const pkgJsonPath = path.join(cloneDir, 'package.json')
    const hasPackageJson = await fs.stat(pkgJsonPath).then(()=>true).catch(()=>false)
    
    let defaultStartCmd = startCommand || (hasPackageJson ? 'npm start' : 'node index.js')
    if (envType.includes('python')) {
      defaultStartCmd = startCommand || 'python main.py'
    }

    const dockerfileContent = `
FROM ${envType || 'node:18-alpine'}
WORKDIR /app
COPY . .
${hasPackageJson ? 'RUN npm install' : ''}
${envType.includes('python') ? 'RUN pip install -r requirements.txt || true' : ''}
CMD ${defaultStartCmd}
    `
    
    await fs.writeFile(path.join(cloneDir, 'Dockerfile'), dockerfileContent)

    // 3. Build Docker Image
    console.log(`Building image for ${botName}...`)
    const imageName = `minibot-${botName.toLowerCase()}-${deploymentId}`
    const stream = await docker.getDocker().buildImage({
      context: cloneDir,
      src: ['Dockerfile', '.']
    }, { t: imageName })

    await new Promise((resolve, reject) => {
      docker.getDocker().modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res))
    })

    // 4. Run Container
    console.log(`Starting container ${botName}...`)
    const container = await docker.getDocker().createContainer({
      Image: imageName,
      name: `${botName}-${deploymentId}`,
      HostConfig: {
        Memory: 1024 * 1024 * 1024, // 1GB RAM Limit
        CpuQuota: 100000 // 1 vCPU
      }
    })

    await container.start()

    // 5. Update DB Status
    await Deployment.findByIdAndUpdate(deploymentId, { 
      status: 'running',
      containerId: container.id,
      image: imageName
    })

    // 6. Cleanup clone dir
    await fs.rm(cloneDir, { recursive: true, force: true })
    console.log(`Deployed successfully!`)

  } catch (error) {
    console.error('Deployment Failed:', error)
    await Deployment.findByIdAndUpdate(deploymentId, { status: 'failed' })
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectToDatabase()
  const userId = (session.user as any)?.id || session.user?.email;
  const deployments = await Deployment.find({ userId })
  return NextResponse.json({ deployments })
}
