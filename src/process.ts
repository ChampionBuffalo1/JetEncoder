import path from 'node:path';
import fs from 'node:fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import { asyncFfmpeg } from './utils';
import { TranscodeInfo } from './type';
import { FFMPEG_MAX_THREADS } from '../Constant';

/**
 * Quality settings for various video quality
 * Ref {@Link https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices}
 */
const qualities = [
  {
    width: 256,
    height: 144,
    maxrate: 344,
    bufsize: 480,
    audio_bitrate: 64
  },
  {
    width: 640,
    height: 360,
    maxrate: 856,
    bufsize: 1200,
    audio_bitrate: 96
  },
  {
    width: 842,
    height: 480,
    maxrate: 1498,
    bufsize: 2100,
    audio_bitrate: 128
  },
  {
    width: 1280,
    height: 720,
    maxrate: 2996,
    bufsize: 4200,
    audio_bitrate: 128
  }
  // {
  //   width: 1920,
  //   height: 1080,
  //   maxrate: 5350,
  //   bufsize: 7500,
  //   audio_bitrate: 192
  // }
];

/**
 * Reference for ffmpeg commands:
 *  - {@link https://medium.com/@peer5/creating-a-production-ready-multi-bitrate-hls-vod-stream-dff1e2f1612c}
 *  - {@link https://stackoverflow.com/questions/70460979/how-do-i-create-an-hls-master-playlist-with-ffmpeg}
 */
export default async function videoTranscoder(fp: string): Promise<TranscodeInfo> {
  const fileName = path.basename(fp);
  const ext = path.extname(fp),
    clean = fileName.replaceAll(ext, '');
  const folder = await fs.mkdtemp(path.join(__dirname, fileName));

  const encoding = ffmpeg(fp);
  if (FFMPEG_MAX_THREADS) encoding.addOption(`-threads ${FFMPEG_MAX_THREADS}`);
  encoding.nativeFramerate();
  encoding.addOutputOptions(qualities.flatMap(() => ['-map 0:v:0', '-map 0:a:0']));
  encoding.addOutputOptions([
    '-c:v h264',
    '-profile:v main',
    '-crf 20',
    '-sc_threshold 0',
    '-g 48',
    '-keyint_min 48',
    '-c:a aac',
    '-ar 48000'
  ]);

  qualities.forEach((quality, id) =>
    encoding.addOutputOption([
      `-filter:v:${id}`,
      `scale=w=${quality.width}:h=${quality.height}:force_original_aspect_ratio=decrease`,
      `-maxrate:v:${id} ${quality.maxrate}k`,
      `-bufsize:v:${id} ${quality.bufsize}k`,
      `-b:a:${id} ${quality.audio_bitrate}k`
    ])
  );

  // Reference: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/1018
  encoding.outputOption('-var_stream_map', qualities.map((_q, id) => `v:${id},a:${id}`).join(' '));
  encoding.addOutputOptions(['-hls_time 4', '-hls_list_size 0', `-master_pl_name ${clean}.m3u8`]);
  encoding.output(`${folder}/%v.m3u8`);
  await asyncFfmpeg(encoding);
  return {
    folder,
    name: `${clean}.m3u8`
  };
}
