import { promisify } from 'node:util';
import type Ffmpeg from 'fluent-ffmpeg';
import { FfprobeData, ffprobe } from 'fluent-ffmpeg';

export const asyncFfprobe = promisify<string, FfprobeData>(ffprobe);
export function asyncFfmpeg(input: Ffmpeg.FfmpegCommand) {
  return new Promise((resolve, reject) => {
    input.on('error', reject).on('end', resolve).run();
  });
}
