import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

import { UserCredential } from '@auth-service/domain/user-credential.entity';
import { User } from '@auth-service/domain/user.entity';
import { PrismaUserRepository } from '@auth-service/infrastructure/database/repositories/prisma-user.repository';
import { PrismaClient, Role } from '@prisma/client';

describe('PrismaUserRepository', () => {
  let prisma: PrismaClient;
  let userRepository: PrismaUserRepository;
  const schema = `test-${randomUUID()}`;

  beforeAll(() => {
    const databaseUrl = `postgresql://test:test@localhost:5432/test-db?schema=${schema}`;
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
    execSync('pnpm prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
      stdio: 'inherit',
    });
    userRepository = new PrismaUserRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await prisma.$disconnect();
  });

  it('should save and retrieve a user', async () => {
    const user = new User(
      randomUUID(),
      'Test User',
      'test@example.com',
      Role.USER,
    );
    const credential = new UserCredential('1', user.id, 'password123');

    await userRepository.save(user, credential);

    const foundUser = await userRepository.findByEmail('test@example.com');
    expect(foundUser).toBeInstanceOf(User);
    expect(foundUser?.email).toBe('test@example.com');
    expect(foundUser?.role).toBe(Role.USER);

    const foundCredential = await userRepository.findCredentialByUserId(
      user.id,
    );
    expect(foundCredential).toBeInstanceOf(UserCredential);
    expect(foundCredential?.passwordHash).toBe('password123');
  });

  it('should return null when finding a user by a non-existent email', async () => {
    const foundUser = await userRepository.findByEmail(
      'nonexistent@example.com',
    );
    expect(foundUser).toBeNull();
  });

  it('should return null when finding credentials by a non-existent user ID', async () => {
    const foundCredential =
      await userRepository.findCredentialByUserId(randomUUID());
    expect(foundCredential).toBeNull();
  });

  it('should throw an error when saving a user with a duplicate email', async () => {
    const user1 = new User(
      randomUUID(),
      'Test User',
      'duplicate@example.com',
      Role.USER,
    );
    const credential1 = new UserCredential('1', user1.id, 'password123');
    await userRepository.save(user1, credential1);

    const user2 = new User(
      randomUUID(),
      'Another User',
      'duplicate@example.com',
      Role.USER,
    );
    const credential2 = new UserCredential('1', user2.id, 'password456');

    await expect(userRepository.save(user2, credential2)).rejects.toThrow();
  });
});
