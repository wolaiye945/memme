import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';
import { createError } from '../middlewares/errorHandler.js';
import { authenticate, AuthRequest } from '../middlewares/auth.js';

const router = Router();

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      throw createError('请填写所有必填字段', 400, 'MISSING_FIELDS');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw createError('该邮箱已被注册', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });

    res.status(201).json({
      success: true,
      data: user,
      message: '注册成功',
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw createError('请输入邮箱和密码', 400, 'MISSING_FIELDS');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw createError('邮箱或密码错误', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw createError('邮箱或密码错误', 401, 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'] }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          avatar: user.avatar,
          storageQuota: user.storageQuota.toString(),
          storageUsed: user.storageUsed.toString(),
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        avatar: true,
        storageQuota: true,
        storageUsed: true,
        settings: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw createError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    // Convert BigInt to string for JSON serialization
    const userData = {
      ...user,
      storageQuota: user.storageQuota.toString(),
      storageUsed: user.storageUsed.toString(),
    };

    res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
