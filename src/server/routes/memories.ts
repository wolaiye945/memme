import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middlewares/auth.js';
import { createError } from '../middlewares/errorHandler.js';
import { generateTitleAndTags } from '../services/llmService.js';

const router = Router();

router.use(authenticate);

// Get all memories
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { page = 1, limit = 20, search, tag, type, startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      userId: req.user!.id,
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { content: { contains: String(search) } },
      ];
    }

    if (tag) {
      where.tags = {
        some: {
          tag: {
            name: String(tag),
          },
        },
      };
    }

    if (type) {
      where.type = String(type);
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate)),
      };
    }

    const [total, items] = await Promise.all([
      prisma.memory.count({ where }),
      prisma.memory.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create memory
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { content, title, type, sourceType, attachments, tags } = req.body;

    if (!content) {
      throw createError('内容不能为空', 400, 'MISSING_CONTENT');
    }

    // Auto-generate title and tags if not provided
    let finalTitle = title;
    let finalTags = tags || [];

    if (!title || !tags || tags.length === 0) {
      const aiResult = await generateTitleAndTags(content);
      if (!title) finalTitle = aiResult.title;
      if (!tags || tags.length === 0) finalTags = aiResult.tags;
    }

    // Create tags if they don't exist
    const tagConnect = [];
    for (const tagName of finalTags) {
      const tag = await prisma.tag.upsert({
        where: {
          name_userId: {
            name: tagName,
            userId: req.user!.id,
          },
        },
        update: {},
        create: {
          name: tagName,
          userId: req.user!.id,
        },
      });
      tagConnect.push({ tagId: tag.id });
    }

    const memory = await prisma.memory.create({
      data: {
        userId: req.user!.id,
        content,
        title: finalTitle,
        type: type || 'NOTE',
        sourceType: sourceType || 'TEXT',
        attachments: JSON.stringify(attachments || []),
        tags: {
          create: tagConnect,
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: memory,
    });
  } catch (error) {
    next(error);
  }
});

// Get single memory
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const memory = await prisma.memory.findUnique({
      where: { id: req.params.id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        parent: true,
        children: {
          select: { id: true, title: true, type: true },
        },
      },
    });

    if (!memory) {
      throw createError('记忆不存在', 404, 'NOT_FOUND');
    }

    if (memory.userId !== req.user!.id) {
      throw createError('无权访问', 403, 'FORBIDDEN');
    }

    res.json({
      success: true,
      data: memory,
    });
  } catch (error) {
    next(error);
  }
});

// Update memory
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { content, title, tags } = req.body;

    const existingMemory = await prisma.memory.findUnique({
      where: { id },
    });

    if (!existingMemory) {
      throw createError('记忆不存在', 404, 'NOT_FOUND');
    }

    if (existingMemory.userId !== req.user!.id) {
      throw createError('无权访问', 403, 'FORBIDDEN');
    }

    // Handle tags update
    let tagUpdate = {};
    if (tags) {
      // Delete existing relations
      await prisma.memoryTag.deleteMany({
        where: { memoryId: id },
      });

      // Create new relations
      const tagConnect = [];
      for (const tagName of tags) {
        const tag = await prisma.tag.upsert({
          where: {
            name_userId: {
              name: tagName,
              userId: req.user!.id,
            },
          },
          update: {},
          create: {
            name: tagName,
            userId: req.user!.id,
          },
        });
        tagConnect.push({ tagId: tag.id });
      }
      tagUpdate = {
        create: tagConnect,
      };
    }

    const memory = await prisma.memory.update({
      where: { id },
      data: {
        content,
        title,
        tags: tags ? tagUpdate : undefined,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: memory,
    });
  } catch (error) {
    next(error);
  }
});

// Delete memory (Soft delete)
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const existingMemory = await prisma.memory.findUnique({
      where: { id },
    });

    if (!existingMemory) {
      throw createError('记忆不存在', 404, 'NOT_FOUND');
    }

    if (existingMemory.userId !== req.user!.id) {
      throw createError('无权访问', 403, 'FORBIDDEN');
    }

    await prisma.memory.update({
      where: { id },
      data: { isDeleted: true },
    });

    res.json({
      success: true,
      message: '记忆已删除',
    });
  } catch (error) {
    next(error);
  }
});

// Generate meta (AI)
router.post('/:id/generate-meta', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const memory = await prisma.memory.findUnique({ where: { id } });

    if (!memory || memory.userId !== req.user!.id) {
      throw createError('记忆不存在或无权访问', 404, 'NOT_FOUND');
    }

    const result = await generateTitleAndTags(memory.content);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
