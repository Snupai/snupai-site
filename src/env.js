import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    SMTP_HOST: z.string(),
    SMTP_PORT: z.string().transform(Number),
    SMTP_USER: z.string(),
    SMTP_PASS: z.string(),
    SMTP_TO_ADDRESS: z.string(),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
    GITHUB_TOKEN: z.string().optional(),
  },
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_TO_ADDRESS: process.env.SMTP_TO_ADDRESS,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
