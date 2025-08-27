import bcrypt from 'bcrypt';

import { createUser, deleteUser, updateUser } from '@/database/queries';
import User from '@/database/schema';
import type { UserSchemaType } from '@/types';

export const UserActions = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;

export async function userAction<
  T extends (typeof UserActions)[keyof typeof UserActions],
>(
  user: T extends typeof UserActions.DELETE ? null : UserSchemaType,
  id: string,
  action: T,
) {
  try {
    switch (action) {
      case UserActions.CREATE:
        return await createUser(user as UserSchemaType);
      case UserActions.UPDATE:
        return await updateUser(user as UserSchemaType, id);
      case UserActions.DELETE:
        return await deleteUser(id);
      default:
        throw new Error('Invalid action');
    }
  } catch (error: any) {
    console.error('Error in userAction:', error);

    return {
      success: false,
      message: (error.message as string) ?? 'Error performing user action',
    };
  }
}

export async function signUpUser({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) {
  // Adjusted type for simplicity, will need to define SignUpUserProps
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return { success: false, message: 'User already exists' };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

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
