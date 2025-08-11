import { Redis } from "ioredis";

// REDIS_URL có thể là string hoặc undefined nếu chưa được định nghĩa trong .env
const REDIS_URL: string | undefined = process.env.REDIS_URL;

// Khai báo biến redis có thể là một instance của Redis hoặc undefined
let redis: Redis | undefined;

if (REDIS_URL) {
    // Nếu REDIS_URL tồn tại, khởi tạo Redis client
    redis = new Redis(REDIS_URL);

    // Xử lý lỗi kết nối Redis
    redis.on("error", (err: Error) => { // Định nghĩa kiểu cho err là Error
        console.error("Redis error: ", err);
    });

    } else {
    // Cảnh báo nếu REDIS_URL không được định nghĩa
    console.warn("REDIS_URL is not defined. Redis caching will be disabled.");
}

export { redis };