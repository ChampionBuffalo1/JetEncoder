import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { uploadStorage } from './storages';
import { PutObjectCommand } from '@aws-sdk/client-s3';

async function uploadFile(filePath: string, prefix?: string): Promise<string> {
  const stats = await fs.stat(filePath);
  const Key = `${prefix && prefix + '/'}${path.basename(filePath)}`;
  const put = new PutObjectCommand({
    Key,
    Bucket: process.env.R2_BUCKET_NAME,
    ContentType: path.extname(filePath) === '.ts' ? 'video/mp2t' : 'application/vnd.apple.mpegurl',
    ContentLength: stats.size,
    Body: fsSync.createReadStream(filePath)
  });
  await uploadStorage.send(put);
  return Key;
}

async function uploadDir(folderPath: string): Promise<string> {
  const files = await fs.readdir(folderPath, {
    recursive: true,
    withFileTypes: true
  });
  const pLimit = (await import('p-limit')).default;
  const uploadLimit = pLimit(30);
  const uuid = crypto.randomUUID().slice(0, 8);
  const prefix = `video/${uuid}`;
  await Promise.all(files.map(file => uploadLimit(uploadFile, path.join(file.path, file.name))));
  await fs.rm(folderPath, { force: true, recursive: true });
  return prefix;
}

export { uploadDir, uploadFile };
