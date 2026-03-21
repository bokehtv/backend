import { prisma } from '../common/prisma';

export class UsersService {
  async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        created_at: true,
        updated_at: true,
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}
