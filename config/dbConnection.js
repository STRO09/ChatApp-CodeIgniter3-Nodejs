import mongoose from 'mongoose';
import "dotenv/config";
const connectDB = async () => {
  try {
 await mongoose.connect(
  process.env.MONGODB_URI,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
);

    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1); // Exit process if DB fails
  }
};

export default connectDB;

