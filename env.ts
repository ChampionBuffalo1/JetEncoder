import { z } from 'zod';

const envVariables = z.object({
  R2_BUCKET_NAME: z.string(),
  R2_ACCOUNT_ID: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),

  RABBIT_MQ_HOST: z.string(),

  AWS_ACCESS_KEY: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  FFMPEG_THREADS: z.string().optional(),
  MQ_ENCODER_QUEUE: z.string().optional(),
  MQ_FINISHED_QUEUE: z.string().optional()
});

envVariables.parse(process.env);

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envVariables> {}
  }
}
