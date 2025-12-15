import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middlewares/auth.js';
import { compressMemories } from '../services/llmService.js';
import { createError } from '../middlewares/errorHandler.js';

const router = Router();

router.use(authenticate);

// Get compression logs
router.get('/logs', async (req: AuthRequest, res, next) => {
  try {
    const logs = await prisma.compressionLog.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
});

// Preview compression
router.get('/preview', async (req: AuthRequest, res, next) => {
  try {
    const { period = 'DAY' } = req.query;
    
    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    if (period === 'DAY') startDate.setDate(startDate.getDate() - 1);
    else if (period === 'WEEK') startDate.setDate(startDate.getDate() - 7);
    else if (period === 'MONTH') startDate.setMonth(startDate.getMonth() - 1);
    else if (period === 'YEAR') startDate.setFullYear(startDate.getFullYear() - 1);

    const memories = await prisma.memory.findMany({
      where: {
        userId: req.user!.id,
        isDeleted: false,
        isCompressed: false,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: {
        period,
        count: memories.length,
        memories,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Execute compression
router.post('/compress', async (req: AuthRequest, res, next) => {
  try {
    const { period = 'DAY', memoryIds } = req.body;

    if (!memoryIds || !Array.isArray(memoryIds) || memoryIds.length === 0) {
      throw createError('请选择要压缩的记忆', 400, 'NO_MEMORIES_SELECTED');
    }

    const memories = await prisma.memory.findMany({
      where: {
        id: { in: memoryIds },
        userId: req.user!.id,
      },
    });

    if (memories.length === 0) {
      throw createError('未找到有效记忆', 404, 'NOT_FOUND');
    }

    // Generate summary using LLM
    const summaryContent = await compressMemories(memories);
    const title = `${period} 记忆回顾 (${new Date().toLocaleDateString()})`;

    // Create summary memory
    const summaryMemory = await prisma.memory.create({
      data: {
        userId: req.user!.id,
        title,
        content: summaryContent,
        type: 'SUMMARY',
        tags: {
          create: {
            tag: {
              connectOrCreate: {
                where: { name_userId: { name: '回顾', userId: req.user!.id } },
                create: { name: '回顾', userId: req.user!.id },
              },
            },
          },
        },
      },
    });

    // Update original memories
    await prisma.memory.updateMany({
      where: { id: { in: memoryIds } },
      data: {
        isCompressed: true,
        parentId: summaryMemory.id,
      },
    });

    // Log compression
    await prisma.compressionLog.create({
      data: {
        userId: req.user!.id,
        period: period as any,
        startDate: memories[memories.length - 1].createdAt,
        endDate: memories[0].createdAt,
        originalCount: memories.length,
        compressedCount: 1,
        summaryMemoryId: summaryMemory.id,
      },
    });

    res.json({
      success: true,
      data: summaryMemory,
      message: `成功压缩 ${memories.length} 条记忆`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
