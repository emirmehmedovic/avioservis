import * as ftp from 'basic-ftp';
import Client from 'ssh2-sftp-client';
import crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
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
  hostFingerprintSha256?: string;
}

function normalizeSha256Fingerprint(fingerprint?: string): string | null {
  if (!fingerprint) return null;
  return fingerprint.trim().replace(/^SHA256:/i, '').replace(/=+$/, '');
}

function getSha256Fingerprint(hostKey: Buffer): string {
  return crypto.createHash('sha256').update(hostKey).digest('base64').replace(/=+$/, '');
}

export class FtpClientService {
  private ftpClient: ftp.Client | null = null;
  private sftpClient: Client | null = null;
  private baseDir: string;
  private isSftp: boolean;

  constructor(private config: FtpConfig) {
    this.isSftp = config.protocol === 'sftp';
    this.baseDir = config.baseDir || '/';
    
    console.log('FtpClientService constructor - protocol:', config.protocol, 'isSftp:', this.isSftp);
    
    if (!this.isSftp) {
      console.log('Creating FTP client...');
      this.ftpClient = new ftp.Client(config.timeoutMs || 30000);
      this.ftpClient.ftp.verbose = false;
    } else {
      console.log('Creating SFTP client...');
      this.sftpClient = new Client();
    }
  }

  async connect(): Promise<void> {
    if (this.isSftp) {
      if (!this.sftpClient) throw new Error('SFTP client not initialized');
      const expectedHostFingerprint = normalizeSha256Fingerprint(this.config.hostFingerprintSha256);
      
      const connectConfig = {
        host: this.config.host,
        port: this.config.port || 22,
        username: this.config.user,
        password: this.config.password,
        readyTimeout: 30000,
        tryKeyboard: true,

        hostVerifier: (hostKey: Buffer) => {
          if (!expectedHostFingerprint) return true;

          const actualHostFingerprint = getSha256Fingerprint(hostKey);
          const verified = actualHostFingerprint === expectedHostFingerprint;
          if (!verified) {
            console.error(
              'SFTP host key fingerprint mismatch. Expected:',
              `SHA256:${expectedHostFingerprint}`,
              'Actual:',
              `SHA256:${actualHostFingerprint}`
            );
          }
          return verified;
        },
        algorithms: {
          serverHostKey: ['ecdsa-sha2-nistp256', 'ssh-rsa', 'ssh-dss'] as any,
          kex: [
            'diffie-hellman-group1-sha1',
            'diffie-hellman-group14-sha1',
            'diffie-hellman-group-exchange-sha1'
          ] as any,
          cipher: [
            'aes128-cbc',
            'aes192-cbc',
            'aes256-cbc',
            '3des-cbc'
          ] as any,
          hmac: [
            'hmac-sha1',
            'hmac-md5'
          ] as any
        }
      };
      
      console.log('SFTP connecting to:', this.config.host, 'port:', this.config.port, 'user:', this.config.user);
      await this.sftpClient.connect(connectConfig);
      console.log('SFTP connection established successfully');
    } else {
      if (!this.ftpClient) throw new Error('FTP client not initialized');
      
      const accessOptions: ftp.AccessOptions = {
        host: this.config.host,
        port: this.config.port || 21,
        user: this.config.user,
        password: this.config.password,
        secure: this.config.secure || false,
      };
      await this.ftpClient.access(accessOptions);
      if (this.baseDir && this.baseDir !== '/') {
        await this.ensureDir(this.baseDir);
        await this.ftpClient.cd(this.baseDir);
      }
    }
  }

  async close(): Promise<void> {
    if (this.isSftp) {
      if (this.sftpClient) {
        await this.sftpClient.end();
        this.sftpClient = null;
      }
    } else {
      if (this.ftpClient) {
        this.ftpClient.close();
      }
    }
  }

  async ensureDir(remoteDir: string): Promise<void> {
    if (this.isSftp) {
      if (!this.sftpClient) throw new Error('SFTP client not connected');
      
      try {
        await this.sftpClient.mkdir(remoteDir, true);
      } catch (error) {
        // Directory might already exist, check if it's accessible
        try {
          await this.sftpClient.stat(remoteDir);
        } catch (statError) {
          throw new Error(`Failed to create or access directory ${remoteDir}: ${error}`);
        }
      }
    } else {
      if (!this.ftpClient) throw new Error('FTP client not initialized');
      
      const segments = remoteDir.split('/').filter(Boolean);
      let current = '';
      for (const segment of segments) {
        current = path.posix.join(current, segment);
        try {
          await this.ftpClient.cd(current);
        } catch {
          await this.ftpClient.send(`MKD ${current}`);
          await this.ftpClient.cd(current);
        }
      }
    }
  }

  async uploadBuffer(buffer: Buffer, remotePath: string): Promise<void> {
    if (this.isSftp) {
      if (!this.sftpClient) throw new Error('SFTP client not connected');
      
      try {
        // Ensure directory exists
        const remoteDir = path.posix.dirname(remotePath);
        if (remoteDir && remoteDir !== '.' && remoteDir !== '/') {
          await this.ensureDir(remoteDir);
        }
        
        // Upload buffer directly
        await this.sftpClient.put(buffer, remotePath);
        console.log('SFTP upload completed:', remotePath);
      } catch (error) {
        console.error('SFTP upload error:', error);
        throw error;
      }
    } else {
      if (!this.ftpClient) throw new Error('FTP client not initialized');
      
      const dir = path.posix.dirname(remotePath);
      await this.ensureDir(dir);
      const stream = new PassThrough();
      stream.end(buffer);
      await this.ftpClient.uploadFrom(stream, remotePath);
    }
  }
}

export function buildFtpConfigFromEnv(): FtpConfig {
  return {
    protocol: (process.env.SFTP_PROTOCOL as any) || 'sftp',
    host: process.env.SFTP_HOST || '',
    port: process.env.SFTP_PORT ? parseInt(process.env.SFTP_PORT, 10) : undefined,
    user: process.env.SFTP_USERNAME || '',
    password: process.env.SFTP_PASSWORD || '',
    secure: process.env.SFTP_PROTOCOL === 'sftp' || false,
    baseDir: process.env.SFTP_BASE_DIR || '/',
    timeoutMs: process.env.SFTP_TIMEOUT_MS ? parseInt(process.env.SFTP_TIMEOUT_MS, 10) : 30000,
    hostFingerprintSha256: process.env.SFTP_HOST_FINGERPRINT_SHA256,
  };
}
