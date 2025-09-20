// mongodb/db.ts
import { MongoClient, MongoClientOptions } from "mongodb";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Please add your MONGODB_URI to .env.local");
}

const options: MongoClientOptions = {}; // thêm tùy chọn nếu cần

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // Khai báo biến global để TypeScript không báo lỗi
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// Sử dụng biến global cho development để tránh tạo nhiều kết nối
if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Hàm connect Mongoose
export const connectMongo = async (): Promise<typeof mongoose> => {
  try {
    return await mongoose.connect(uri);
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err; // ném lỗi để caller biết
  }
};

export default clientPromise;
