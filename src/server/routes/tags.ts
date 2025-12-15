import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const tags = await prisma.tag.findMany({
      where: { userId: req.user!.id },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
