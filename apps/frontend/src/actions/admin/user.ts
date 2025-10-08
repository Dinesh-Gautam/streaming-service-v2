'use server';

import type { UserSchemaType } from '@/lib/validation/schemas';

import { getAuthServiceUrl } from '@/actions/admin/utils';
import { authorize } from '@/lib/safe-action';
import { User } from '@/lib/types';

const _getUsers = authorize(
  (_, accessToken) => async (): Promise<User[]> => {
    const authServiceUrl = getAuthServiceUrl();
    if (!authServiceUrl) return [];

    try {
      const response = await fetch(`${authServiceUrl}/users`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unknown error');
      }
      return (await response.json()) as User[];
    } catch (error) {
      console.error(
        'Error fetching users: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
      return [];
    }
  },
  ['ADMIN'],
);

export async function getUsers(): Promise<User[]> {
  const users = await _getUsers();
  return users ?? [];
}

const _getUserById = authorize(
  (_, accessToken) =>
    async (userId: string): Promise<User | null> => {
      const authServiceUrl = getAuthServiceUrl();
      if (!authServiceUrl) return null;

      try {
        const response = await fetch(`${authServiceUrl}/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Unknown error');
        }
        return (await response.json()) as User;
      } catch (error) {
        console.error(
          'Error fetching user: ' +
            (error instanceof Error ? error.message : 'Unknown error'),
        );
        return null;
      }
    },
  ['ADMIN'],
);

export async function getUserById(userId: string): Promise<User | null> {
  return await _getUserById(userId);
}

const _createUser = authorize(
  (_, accessToken) =>
    async (data: UserSchemaType): Promise<User | null> => {
      const authServiceUrl = getAuthServiceUrl();
      if (!authServiceUrl) return null;

      try {
        const response = await fetch(`${authServiceUrl}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Unknown error');
        }
        return (await response.json()) as User;
      } catch (error) {
        console.error(
          'Error creating user: ' +
            (error instanceof Error ? error.message : 'Unknown error'),
        );
        return null;
      }
    },
  ['ADMIN'],
);

export async function createUser(data: UserSchemaType): Promise<User | null> {
  return await _createUser(data);
}

const _updateUser = authorize(
  (_, accessToken) =>
    async (
      userId: string,
      data: Partial<UserSchemaType>,
    ): Promise<User | null> => {
      const authServiceUrl = getAuthServiceUrl();
      if (!authServiceUrl) return null;

      try {
        const response = await fetch(`${authServiceUrl}/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Unknown error');
        }
        return (await response.json()) as User;
      } catch (error) {
        console.error(
          'Error updating user: ' +
            (error instanceof Error ? error.message : 'Unknown error'),
        );
        return null;
      }
    },
  ['ADMIN'],
);

export async function updateUser(
  userId: string,
  data: Partial<UserSchemaType>,
): Promise<User | null> {
  return await _updateUser(userId, data);
}

const _deleteUser = authorize(
  (_, accessToken) =>
    async (userId: string): Promise<boolean> => {
      const authServiceUrl = getAuthServiceUrl();
      if (!authServiceUrl) return false;

      try {
        const response = await fetch(`${authServiceUrl}/users/${userId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          return true;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Unknown error');
        }
      } catch (error) {
        console.error(
          'Error deleting user: ' +
            (error instanceof Error ? error.message : 'Unknown error'),
        );
        return false;
      }
    },
  ['ADMIN'],
);

export async function deleteUser(userId: string): Promise<boolean> {
  const success = await _deleteUser(userId);
  return success ?? false;
}
