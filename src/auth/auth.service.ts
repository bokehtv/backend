import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../common/prisma';
import { generateAccessToken, generateRefreshToken } from '../common/jwt';

export const RegisterDto = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
});

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type RegisterInput = z.infer<typeof RegisterDto>;
export type LoginInput = z.infer<typeof LoginDto>;

export class AuthService {
  async register(data: RegisterInput) {
    // // why: Checking if uniqueness holds before insert ensures predictable error handling
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    });
    if (existingUser) {
      throw new Error('User with that email or username already exists');
    }

    // Hash the password with 10 rounds per DECISIONS.md
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password_hash,
      },
    });

    const { password_hash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(data.password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const accessToken = generateAccessToken({ userId: user.id });
    const refreshToken = generateRefreshToken({ userId: user.id });

    const { password_hash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }
}
