'use server';

import 'server-only';

import bycrypt from 'bcrypt';

import type { SignUpUserProps } from '@/app/(public)/signup/types';
import User from '@/server/db/schemas/user';

export async function signUpUser({ email, password, name }: SignUpUserProps) {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return { success: false, message: 'User already exists' };
  }

  const hashedPassword = await bycrypt.hash(password, 10);

  const user = new User({
    email,
    hashedPassword,
    name,
    role: 'user',
    creationDate: new Date(),
  });

  try {
    await user.save();
  } catch (e: any) {
    console.error(e);
    return { success: false, message: e.message };
  }

  return {
    success: true,
    message: 'User created successfully',
  };
}
