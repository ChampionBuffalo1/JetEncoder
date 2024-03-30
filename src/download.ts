import path from 'node:path';
import fsSync from 'node:fs';
import crypto from 'node:crypto';
import { downloadStorage } from './storages';
import fs, { FileHandle } from 'node:fs/promises';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { CHUNK_SIZE_PERCENTAGE, RAW_VIDEO_FOLDER_NAME, WORKER_COUNT } from '../Constant';

const folderPath = path.join(process.cwd(), RAW_VIDEO_FOLDER_NAME);
if (!fsSync.existsSync(folderPath)) {
  fsSync.mkdirSync(folderPath, { recursive: true });
}
async function downloadChunk(
  bucket: string,
  key: string,
  file: FileHandle,
  start?: number,
  end?: number
): Promise<void> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    Range: start !== undefined && end !== undefined ? `bytes=${start}-${end}` : undefined
  });
  const { Body } = await downloadStorage.send(command);
  if (!Body) throw new Error('Invalid chunk');
  // TODO: Somehow pipe the content appropriately to the file
  // currently its taking a long time to convert the body into an Uint8Array
  const data = await Body.transformToByteArray();
  const writable = file.createWriteStream({ start });
  return new Promise<void>((resolve, reject) =>
    writable.write(data, err => {
      if (err) reject(err);
      else resolve();
    })
  );
}

const getFileName = (key: string) => {
  const uuid = crypto.randomUUID().slice(0, 8);
  if (!folderPath) throw new Error('no raw folder found');
  return path.join(folderPath, `${uuid}${path.extname(key) || '.mp4'}`);
};

// Inspiration: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example_s3_Scenario_UsingLargeFiles_section.html
async function getParallel(bucket: string, key: string, size: number): Promise<string> {
  const filePath = getFileName(key);
  const chunkSize = Math.ceil(size * CHUNK_SIZE_PERCENTAGE);
  const totalBytes = size;
  const pieces = [];
  const pLimit = (await import('p-limit')).default;
  const parallelLimit = pLimit(WORKER_COUNT);

  const file = await fs.open(filePath, 'w');
  for (let start = 0; start < totalBytes; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, totalBytes - 1);
    pieces.push(parallelLimit(downloadChunk, bucket, key, file, start, end));
  }
  await Promise.all(pieces);
  await file.close();
  return filePath;
}

async function getSerial(bucket: string, key: string): Promise<string> {
  const filePath = getFileName(key);
  const file = await fs.open(filePath, 'w');
  await downloadChunk(bucket, key, file);
  await file.close();
  return filePath;
}

export { getParallel, getSerial };
