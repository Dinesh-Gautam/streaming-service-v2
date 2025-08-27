import bycrypt from 'bcrypt';

import User from '@/database/schema';
import type { UserSchemaType } from '@/types';

export async function getAllUsers() {
  const users = await User.find({})
    .select({ name: true, email: true, role: true, creationDate: true })
    .limit(20);

  return users.map((user) => {
    const { _id, ...plainUser } = user.toObject();
    return {
      ...plainUser,
      id: _id.toString(),
    };
  });
}

export async function updateUser(user: UserSchemaType, id: string) {
  const { name, email, role } = user;

  const updatedUser = await User.findByIdAndUpdate(id, { name, email, role });

  if (!updatedUser) {
    throw new Error('User not found');
  }

  return {
    success: true,
  };
}

export async function createUser(user: UserSchemaType) {
  if (!user.password) {
    throw new Error('Password is required when creating new user');
  }

  const hashedPassword = await bycrypt.hash(user.password, 10);

  const newUser = await User.create({
    ...user,
    hashedPassword,
  });

  if (!newUser) {
    throw new Error('Error creating user');
  }

  return {
    success: true,
  };
}

export async function deleteUser(id: string) {
  const deletedUser = await User.findByIdAndDelete(id);

  if (!deletedUser) {
    throw new Error('User not found');
  }

  return {
    success: true,
  };
}

export async function getUserById(id: string) {
  const user = await User.findById(id).select({
    name: true,
    email: true,
    role: true,
    creationDate: true,
  });

  if (!user) {
    throw new Error('User not found');
  }

  const { _id, ...plainUser } = user.toObject();
  return {
    ...plainUser,
    id: _id.toString(),
  };
}
