import express from 'express';
import cors from 'cors';
import connectDB from './config/dbConnection.js';
import { initSocket } from './sockets/socket.js';
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import messageRoutes from "./routes/MessageRoutes.js";
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
app.use(cors({
  origin: ["http://localhost", "http://127.0.0.1", "http://10.10.15.140", 'http://[::1]'],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// DB connection
connectDB();

// Routes
app.use('/api', userRoutes);
app.use('/api', conversationRoutes);
app.use('/api', messageRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
initSocket(server);

// Start server
const PORT = process.env.PORT || 7360;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});