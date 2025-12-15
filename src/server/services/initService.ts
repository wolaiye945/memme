import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function initializeAdmin(prisma: PrismaClient) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminUsername = process.env.ADMIN_USERNAME || '管理员';

  if (!adminEmail || !adminPassword) {
    console.log('⚠️  No admin credentials configured');
    return;
  }

  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await prisma.user.create({
      data: {
        email: adminEmail,
        username: adminUsername,
        passwordHash,
        role: 'ADMIN',
        storageQuota: BigInt(10737418240), // 10GB for admin
      },
    });

    console.log('✅ Admin user created:', adminEmail);
  } catch (error) {
    console.error('Failed to create admin user:', error);
  }
}
