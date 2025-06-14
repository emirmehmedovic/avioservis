import { PrismaClient, User, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

type UserData = Pick<User, 'id' | 'username' | 'role' | 'createdAt' | 'updatedAt'>;

export interface CreateUserInput {
  username: string;
  password?: string; 
  role: Role;
}

export async function findUserByUsername(username: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { username },
  });
}

export async function findAllUsers(): Promise<UserData[]> {
  return prisma.user.findMany({
    select: { id: true, username: true, role: true, createdAt: true, updatedAt: true },
  });
}

export async function findUserById(id: number): Promise<UserData | null> {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, role: true, createdAt: true, updatedAt: true },
  });
}

interface UpdateUserInput {
  username?: string;
  role?: Role;
}

export async function updateUserById(id: number, data: UpdateUserInput): Promise<UserData | null> {
    // Check if data is empty to prevent unnecessary DB call, though controller should also check
    if (Object.keys(data).length === 0) {
        // Or throw an error, or return the user found by ID without updating
        // For now, let's assume controller validates this and proceed with potential update
    }
  try {
    return await prisma.user.update({
      where: { id },
      data: data,
      select: { id: true, username: true, role: true, createdAt: true, updatedAt: true },
    });
  } catch (error: any) {
    // Re-throw the error to be handled by the controller, or handle specific Prisma errors here
    // For example, P2025 (Record to update not found) or P2002 (Unique constraint failed)
    throw error; 
  }
}

export async function createUser(data: CreateUserInput): Promise<User> {
  if (!data.password) {
    throw new Error('Password is required to create a user.');
  }
  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
  try {
    return await prisma.user.create({
      data: {
        username: data.username,
        passwordHash: hashedPassword,
        role: data.role,
      },
    });
  } catch (error: any) {
    // Re-throw the error to be handled by the controller
    // Specific Prisma errors (like P2002 for unique constraint) will be caught there
    throw error;
  }
}

export async function deleteUserById(id: number): Promise<User | null> {
  try {
    return await prisma.user.delete({ where: { id } });
  } catch (error: any) {
    // Re-throw or handle specific Prisma errors (e.g., P2025 - Record to delete not found)
    throw error;
  }
}
