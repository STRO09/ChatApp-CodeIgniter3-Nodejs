import express from 'express';
import cors from 'cors';
import connectDB, {closeConnection} from './config/dbConnection.js';
import { initSocket } from './sockets/socket.js';
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import messageRoutes from "./routes/MessageRoutes.js";
import { errorHandler } from './utils/ErrorHandler.js';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost" || 'http://[::1]',
    methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true, // Allow cookies
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use('/uploads', express.static(uploadsDir));


if  (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, {
      body: req.body,
      cookies: req.cookies,
    });
    next();
  });
}

// DB connection
connectDB();

// Routes
app.use('/api', userRoutes);
app.use('/api', conversationRoutes);
app.use('/api', messageRoutes);

app.use("/", (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 404,
      message: "Route not found",
      path: req.originalUrl,
    },
  });
});

app.use(errorHandler);

// Will keep cleanup optional for now since we detect token reuse and dont got memory problems for now
// Cleanup expired tokens every hour
// setInterval(async () => {
//   try {
//     await cleanupExpiredTokens();
//   } catch (error) {
//     console.error("Error cleaning up expired tokens:", error);
//   }
// }, 60 * 60 * 1000); // 1 hour



// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
initSocket(server);

// Graceful Shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  closeConnection(false);
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  closeConnection(true);
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 7360;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
