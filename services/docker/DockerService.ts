import Docker from 'dockerode';

class DockerService {
  private static instance: DockerService;
  private docker: Docker;

  private constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  public static getInstance(): DockerService {
    if (!DockerService.instance) {
      DockerService.instance = new DockerService();
    }
    return DockerService.instance;
  }

  public getDocker(): Docker {
    return this.docker;
  }

  public async createContainer(options: Docker.ContainerCreateOptions) {
    try {
      const container = await this.docker.createContainer(options);
      return container;
    } catch (error) {
      console.error('Error creating container:', error);
      throw error;
    }
  }

  public async startContainer(containerId: string) {
    try {
      const container = this.docker.getContainer(containerId);
      await container.start();
    } catch (error) {
      console.error('Error starting container:', error);
      throw error;
    }
  }

  public async stopContainer(containerId: string) {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop();
    } catch (error) {
      console.error('Error stopping container:', error);
      throw error;
    }
  }

  public async deleteContainer(containerId: string) {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force: true });
    } catch (error) {
      console.error('Error deleting container:', error);
      throw error;
    }
  }

  public async getLogs(containerId: string): Promise<NodeJS.ReadableStream> {
    try {
      const container = this.docker.getContainer(containerId);
      const stream = await container.logs({ 
        follow: true, 
        stdout: true, 
        stderr: true,
        tail: 100 
      });
      return stream;
    } catch (error) {
      console.error('Error getting container logs:', error);
      throw error;
    }
  }
}

export default DockerService;
