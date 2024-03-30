import os from 'node:os';
export const WORKER_COUNT = 5;
export const RAW_VIDEO_FOLDER_NAME = 'raw';
export const CHUNK_SIZE_PERCENTAGE = 0.15; // filesize * 15% = chunkSize
export const NO_CHUNK_LIMIT = 1024 * 1024 * 200; // No chunking for files smaller than 200mb

export const MQ_ENCODER_QUEUE = process.env.MQ_ENCODER_QUEUE || 'fast-encoder';
export const MQ_FINISHED_QUEUE = process.env.MQ_FINISHED_QUEUE || 'encoding-finish';

export const FFMPEG_MAX_THREADS =
  // Note: NaN < cpus will also eval to false
  process.env.FFMPEG_THREADS && Number.parseInt(process.env.FFMPEG_THREADS, 10) < Object.keys(os.cpus()).length
    ? Number.parseInt(process.env.FFMPEG_THREADS, 10)
    : undefined;
