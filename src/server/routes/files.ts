import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthRequest } from '../middlewares/auth.js';
import { createError } from '../middlewares/errorHandler.js';
import { prisma } from '../index.js';

const router = Router();

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
  },
});

router.use(authenticate);

router.post('/upload', upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      throw createError('未上传文件', 400, 'NO_FILE');
    }

    // Check storage quota
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { storageQuota: true, storageUsed: true },
    });

    if (user) {
      const newUsed = BigInt(user.storageUsed) + BigInt(req.file.size);
      if (newUsed > user.storageQuota) {
        // Delete uploaded file
        fs.unlinkSync(req.file.path);
        throw createError('存储空间不足', 403, 'QUOTA_EXCEEDED');
      }

      // Update usage
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { storageUsed: newUsed },
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        filename: req.file.originalname,
        path: fileUrl,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
