import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import memoryRoutes from './routes/memories.js';
import tagRoutes from './routes/tags.js';
import compressionRoutes from './routes/compression.js';
import fileRoutes from './routes/files.js';
import adminRoutes from './routes/admin.js';
import shareRoutes from './routes/share.js';
import llmRoutes from './routes/llm.js';
import exportRoutes from './routes/export.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { initializeAdmin } from './services/initService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 13001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/compression', compressionRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/export', exportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
  });
}

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Initialize admin user
    await initializeAdmin(prisma);
    
    app.listen(PORT, () => {
      console.log(`🚀 MemMe server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { prisma };
