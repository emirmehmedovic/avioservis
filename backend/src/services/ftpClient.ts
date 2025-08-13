import ftp, { AccessOptions } from 'basic-ftp';
import path from 'path';
import { PassThrough } from 'stream';

export interface FtpConfig {
  protocol?: 'ftp' | 'sftp';
  host: string;
  port?: number;
  user: string;
  password: string;
  secure?: boolean;
  baseDir?: string;
  timeoutMs?: number;
}

export class FtpClientService {
  private client: ftp.Client;
  private baseDir: string;

  constructor(private config: FtpConfig) {
    this.client = new ftp.Client(config.timeoutMs || 30000);
    this.client.ftp.verbose = false;
    this.baseDir = config.baseDir || '/';
  }

  async connect(): Promise<void> {
    const accessOptions: AccessOptions = {
      host: this.config.host,
      port: this.config.port || 21,
      user: this.config.user,
      password: this.config.password,
      secure: this.config.secure || false,
    };
    await this.client.access(accessOptions);
    if (this.baseDir && this.baseDir !== '/') {
      await this.ensureDir(this.baseDir);
      await this.client.cd(this.baseDir);
    }
  }

  async close(): Promise<void> {
    this.client.close();
  }

  async ensureDir(remoteDir: string): Promise<void> {
    const segments = remoteDir.split('/').filter(Boolean);
    let current = '';
    for (const segment of segments) {
      current = path.posix.join(current, segment);
      try {
        await this.client.cd(current);
      } catch {
        await this.client.send(`MKD ${current}`);
        await this.client.cd(current);
      }
    }
  }

  async uploadBuffer(buffer: Buffer, remotePath: string): Promise<void> {
    const dir = path.posix.dirname(remotePath);
    await this.ensureDir(dir);
    const stream = new PassThrough();
    stream.end(buffer);
    await this.client.uploadFrom(stream, remotePath);
  }
}

export function buildFtpConfigFromEnv(): FtpConfig {
  return {
    protocol: (process.env.FTP_PROTOCOL as any) || 'ftp',
    host: process.env.FTP_HOST || '',
    port: process.env.FTP_PORT ? parseInt(process.env.FTP_PORT, 10) : undefined,
    user: process.env.FTP_USER || '',
    password: process.env.FTP_PASSWORD || '',
    secure: process.env.FTP_SECURE === 'true',
    baseDir: process.env.FTP_BASE_DIR || '/invoices',
    timeoutMs: process.env.FTP_TIMEOUT_MS ? parseInt(process.env.FTP_TIMEOUT_MS, 10) : 30000,
  };
}


