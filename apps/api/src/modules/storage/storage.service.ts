import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

/** Thin MinIO wrapper. Buckets are created by the compose `minio-init` service. */
@Injectable()
export class StorageService {
  private readonly client: Minio.Client;
  private readonly publicClient: Minio.Client;
  readonly uploadsBucket: string;
  readonly documentsBucket: string;

  constructor(config: ConfigService) {
    const internal = {
      endPoint: config.get('MINIO_ENDPOINT', 'localhost'),
      port: Number(config.get('MINIO_PORT', 9000)),
      useSSL: config.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: config.get('MINIO_ACCESS_KEY', ''),
      secretKey: config.get('MINIO_SECRET_KEY', ''),
    };
    this.client = new Minio.Client(internal);
    // Presigned URLs are opened by BROWSERS: when the API runs in Docker its
    // internal endpoint ("minio") is unreachable from outside, so links must
    // be signed against the host-facing address instead.
    this.publicClient = new Minio.Client({
      ...internal,
      endPoint: config.get('MINIO_PUBLIC_ENDPOINT', internal.endPoint),
      port: Number(config.get('MINIO_PUBLIC_PORT', internal.port)),
      // Pin the region so signing never needs to contact the endpoint —
      // the public address is unreachable from inside the container.
      region: 'us-east-1',
    });
    this.uploadsBucket = config.get('MINIO_BUCKET_UPLOADS', 'uploads');
    this.documentsBucket = config.get('MINIO_BUCKET_DOCUMENTS', 'documents');
  }

  async putObject(bucket: string, key: string, data: Buffer, contentType: string): Promise<void> {
    await this.client.putObject(bucket, key, data, data.length, { 'Content-Type': contentType });
  }

  async getObject(bucket: string, key: string): Promise<Buffer> {
    const stream = await this.client.getObject(bucket, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks);
  }

  async removeObject(bucket: string, key: string): Promise<void> {
    await this.client.removeObject(bucket, key);
  }

  listObjects(bucket: string, prefix: string): Promise<Array<{ name: string; size: number; lastModified: Date }>> {
    return new Promise((resolve, reject) => {
      const out: Array<{ name: string; size: number; lastModified: Date }> = [];
      const stream = this.client.listObjectsV2(bucket, prefix, true);
      stream.on('data', (o) => {
        if (o.name) out.push({ name: o.name, size: o.size ?? 0, lastModified: o.lastModified ?? new Date() });
      });
      stream.on('end', () => resolve(out));
      stream.on('error', reject);
    });
  }

  /** Presigned download URL (default 7 days — the max MinIO allows). */
  presignedGet(bucket: string, key: string, expirySeconds = 7 * 24 * 3600): Promise<string> {
    return this.publicClient.presignedGetObject(bucket, key, expirySeconds);
  }
}
