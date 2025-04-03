'use server';

import 'server-only';

import { createUser, deleteUser, updateUser } from '@/lib/db/users';
import type { UserSchemaType } from '@/lib/validation/schemas';

const UserActions = {
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
