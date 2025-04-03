'use server';

import 'server-only';

import { createUser, updateUser } from '@/lib/db/users';
import type { UserSchemaType } from '@/lib/validation/schemas';

const UserActions = {
  CREATE: 'create',
  UPDATE: 'update',
} as const;

export async function userAction(
  user: UserSchemaType,
  id: string,
  action: (typeof UserActions)[keyof typeof UserActions],
) {
  try {
    switch (action) {
      case UserActions.CREATE:
        return await createUser(user);
      case UserActions.UPDATE:
        return await updateUser(user, id);
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
