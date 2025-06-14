import { PrismaClient, User, Role, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function findUserByUsername(username: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { username },
  });
}

export async function createUser(username: string, passwordRAW: string, role: Role): Promise<User> {
  const passwordHash = await bcrypt.hash(passwordRAW, 10);
  return prisma.user.create({
    data: { username, passwordHash, role },
  });
}

export async function findUserById(id: number): Promise<Pick<User, 'id' | 'username' | 'role' | 'createdAt' | 'updatedAt'> | null> {
    return prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true, role: true, createdAt: true, updatedAt: true }
    });
}

// Increment failed login attempts
export async function incrementFailedLoginAttempts(userId: number): Promise<User> {
  // Using a more comprehensive type assertion to fix TypeScript errors
  return prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: {
        increment: 1
      }
    } as any // Cast the entire data object to any to bypass TypeScript checking
  });
}

// Reset failed login attempts after successful login
export async function resetFailedLoginAttempts(userId: number): Promise<User> {
  // Using a more comprehensive type assertion to fix TypeScript errors
  return prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockUntil: null
    } as any // Cast the entire data object to any to bypass TypeScript checking
  });
}

// Lock user account until specified time
export async function lockUser(userId: number, lockUntil: Date): Promise<User> {
  // Using a more comprehensive type assertion to fix TypeScript errors
  return prisma.user.update({
    where: { id: userId },
    data: {
      lockUntil
    } as any // Cast the entire data object to any to bypass TypeScript checking
  });
}
