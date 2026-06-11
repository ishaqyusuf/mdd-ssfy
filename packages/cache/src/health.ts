import { RedisCache } from "./redis-client";

const cache = new RedisCache("health", 60);

export async function cacheHealthCheck(): Promise<void> {
  await cache.healthCheck();
}
