import 'dotenv-safe/config';
import amqplib from 'amqplib';
import '@total-typescript/ts-reset';
import { asyncFfprobe } from './utils';
import { uploadDir } from './uploader';
import videoTranscoder from './process';
import type { LambdaTriggerPayload } from './type';
import { getSerial, getParallel } from './download';
import { MQ_ENCODER_QUEUE, MQ_FINISHED_QUEUE, NO_CHUNK_LIMIT } from '../Constant';

(async () => {
  const conn = await amqplib.connect(process.env.RABBIT_MQ_HOST);
  const channel = await conn.createChannel();

  await channel.assertQueue(MQ_ENCODER_QUEUE);
  await channel.prefetch(1); // One message at a time
  console.info('Waiting for messages...');
  channel.consume(MQ_ENCODER_QUEUE, async msg => {
    if (msg !== null) {
      try {
        const message = JSON.parse(msg.content.toString()) as LambdaTriggerPayload;
        // Instantly claim-ing the message so no other works work on same task
        // this could cause some issue if the service crashes but it work for now
        channel.ack(msg);
        let fp: string;
        if (message.size > NO_CHUNK_LIMIT) {
          fp = await getParallel(message.bucket, message.key, message.size);
        } else {
          fp = await getSerial(message.bucket, message.key);
        }
        const data = await asyncFfprobe(fp);
        const hasVideoCodec = data.streams.some(stream => stream.codec_type === 'video');
        if (!hasVideoCodec) {
          // nack message to get it out of the queue
          channel.nack(msg, false, false);
          return;
        }
        const { name, folder } = await videoTranscoder(fp);
        const r2Prefix = await uploadDir(folder);
        channel.sendToQueue(
          MQ_FINISHED_QUEUE,
          Buffer.from(
            JSON.stringify({
              key: message.key,
              r2Name: `${r2Prefix}/${name}`
            })
          )
        );
      } catch (err) {
        console.error(err);
        // Nack with no re-queue
        channel.nack(msg, false, false);
      }
    }
  });
})();
