import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireAdmin, AuthRequest } from '../middlewares/auth.js';
import { createError } from '../middlewares/errorHandler.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

// Get all users
router.get('/users', async (req: AuthRequest, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        storageQuota: true,
        storageUsed: true,
        createdAt: true,
        _count: {
          select: { memories: true },
        },
      },
    });

    const formattedUsers = users.map(u => ({
      ...u,
      storageQuota: u.storageQuota.toString(),
      storageUsed: u.storageUsed.toString(),
    }));

    res.json({
      success: true,
      data: formattedUsers,
    });
  } catch (error) {
    next(error);
  }
});

// Update user quota
router.put('/users/:id/quota', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { quota } = req.body; // in bytes

    await prisma.user.update({
      where: { id },
      data: { storageQuota: BigInt(quota) },
    });

    res.json({
      success: true,
      message: '存储配额已更新',
    });
  } catch (error) {
    next(error);
  }
});

// System stats
router.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const [userCount, memoryCount, totalStorage] = await Promise.all([
      prisma.user.count(),
      prisma.memory.count(),
      prisma.user.aggregate({
        _sum: { storageUsed: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        userCount,
        memoryCount,
        totalStorageUsed: totalStorage._sum.storageUsed?.toString() || '0',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
