import IORedis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var _redis: IORedis | undefined;
}

function buildConnection(): IORedis {
  return new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    // Required by BullMQ — disables the auto-retry that would block the
    // event loop during connection failures.
    maxRetriesPerRequest: null,
  });
}

export const redis = globalThis._redis ?? buildConnection();

if (process.env.NODE_ENV !== "production") globalThis._redis = redis;
