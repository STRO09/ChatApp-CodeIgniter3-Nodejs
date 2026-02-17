import mongoose from "mongoose";
import { seedBotUser } from "../seeders/seedBotUser.js";
import "dotenv/config";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // serverSelectionTimeoutMS : 5000
    });

    console.log("MongoDB connected");

    await seedBotUser();
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1); // Exit process if DB fails
  }
};

export const closeConnection = async (param) => {
  await mongoose.connection.close(param);
  console.log("Connection closed ......")
}

export default connectDB;
