import mongoose from 'mongoose';

const connectDB = async () => {
  try {
 await mongoose.connect(
  "mongodb+srv://chatapp2:slash123@cluster0.q9veugy.mongodb.net/chatapp?retryWrites=true&w=majority",
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

