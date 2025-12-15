import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middlewares/auth.js';
import { createError } from '../middlewares/errorHandler.js';

const router = Router();

// Create share link
router.post('/:memoryId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { memoryId } = req.params;
    const { days = 7 } = req.body; // Default 7 days expiration

    const memory = await prisma.memory.findUnique({
      where: { id: memoryId },
    });

    if (!memory || memory.userId !== req.user!.id) {
      throw createError('记忆不存在或无权访问', 404, 'NOT_FOUND');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const shareCode = uuidv4().slice(0, 8); // Short code

    const share = await prisma.sharedMemory.create({
      data: {
        memoryId,
        userId: req.user!.id,
        shareCode,
        expiresAt,
      },
    });

    res.json({
      success: true,
      data: {
        shareCode,
        url: `/share/${shareCode}`,
        expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Public access to shared memory
router.get('/:shareCode', async (req, res, next) => {
  try {
    const { shareCode } = req.params;

    const share = await prisma.sharedMemory.findUnique({
      where: { shareCode },
      include: {
        memory: {
          include: {
            user: {
              select: { username: true, avatar: true },
            },
          },
        },
      },
    });

    if (!share) {
      throw createError('分享链接无效', 404, 'NOT_FOUND');
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      throw createError('分享链接已过期', 410, 'EXPIRED');
    }

    // Increment view count
    await prisma.sharedMemory.update({
      where: { id: share.id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({
      success: true,
      data: {
        memory: share.memory,
        author: share.memory.user,
        viewCount: share.viewCount + 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
