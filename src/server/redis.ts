import { Redis } from "@upstash/redis";
import { env } from "~/env";

let redis: Redis | null = null;

export function getRedis() {
  redis ??= new Redis({
    url: env.KV_REST_API_URL,
    token: env.KV_REST_API_TOKEN,
  });

  return redis;
}
