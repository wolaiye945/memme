import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

// Export all data
router.get('/download', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const [user, memories, tags] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.memory.findMany({
        where: { userId, isDeleted: false },
        include: { tags: { include: { tag: true } } },
      }),
      prisma.tag.findMany({ where: { userId } }),
    ]);

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      user: {
        username: user?.username,
        email: user?.email,
      },
      memories,
      tags,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=memme-export-${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    next(error);
  }
});

export default router;
