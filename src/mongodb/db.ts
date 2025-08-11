// mongodb/db.ts
import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI as string; // Lấy URI từ biến môi trường
const options = {}; // Các tùy chọn MongoDB client

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
    throw new Error('Please add your MONGODB_URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  // Trong môi trường phát triển, sử dụng biến global để không tạo nhiều kết nối
    if (!(global as any)._mongoClientPromise) {
    client = new MongoClient(uri, options);
    (global as any)._mongoClientPromise = client.connect();
    }
    clientPromise = (global as any)._mongoClientPromise;
} else {
  // Trong môi trường production, tạo kết nối mới
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

export const connectMongo = async () => {
    if (!uri) return;
    try {
        mongoose.connect(uri);
    } catch (err) {
        console.log(err)
    }
}

export default clientPromise; // Export promise để sử dụng