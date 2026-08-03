import { Redis } from "ioredis";

const REDIS_URL: string | undefined = process.env.REDIS_URL;

let redis: Redis | undefined;

if (REDIS_URL) {
    redis = new Redis(REDIS_URL);

    redis.on("error", (err: Error) => { 
        console.error("Redis error: ", err);
    });

    } else {
    console.warn("REDIS_URL is not defined. Redis caching will be disabled.");
}

export { redis };