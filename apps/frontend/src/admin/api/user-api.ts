import { toast } from 'sonner';

import type { UserSchemaType } from '@/lib/validation/schemas';

import { User } from '@/lib/types';

const getAuthServiceUrl = (): string | null => {
  const authServiceUrl = process.env.NEXT_PUBLIC_USER_SERVICE_URL;
  if (!authServiceUrl) {
    toast.error('Auth service URL is not configured.');
    return null;
  }
  return authServiceUrl;
};

export const getUsers = async (): Promise<User[]> => {
  const authServiceUrl = getAuthServiceUrl();
  if (!authServiceUrl) return [];

  try {
    const response = await fetch(`${authServiceUrl}/users`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Unknown error');
    }
    return (await response.json()) as User[];
  } catch (error) {
    toast.error(
      'Error fetching users: ' +
        (error instanceof Error ? error.message : 'Unknown error'),
    );
    return [];
  }
};

export const getUserById = async (userId: string): Promise<User | null> => {
  const authServiceUrl = getAuthServiceUrl();
  if (!authServiceUrl) return null;

  try {
    const response = await fetch(`${authServiceUrl}/users/${userId}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Unknown error');
    }
    return (await response.json()) as User;
  } catch (error) {
    toast.error(
      'Error fetching user: ' +
        (error instanceof Error ? error.message : 'Unknown error'),
    );
    return null;
  }
};

export const createUser = async (
  data: UserSchemaType,
): Promise<User | null> => {
  const authServiceUrl = getAuthServiceUrl();
  if (!authServiceUrl) return null;

  try {
    const response = await fetch(`${authServiceUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Unknown error');
    }
    toast.success('User created successfully.');
    return (await response.json()) as User;
  } catch (error) {
    toast.error(
      'Error creating user: ' +
        (error instanceof Error ? error.message : 'Unknown error'),
    );
    return null;
  }
};

export const updateUser = async (
  userId: string,
  data: Partial<UserSchemaType>,
): Promise<User | null> => {
  const authServiceUrl = getAuthServiceUrl();
  if (!authServiceUrl) return null;

  try {
    const response = await fetch(`${authServiceUrl}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Unknown error');
    }
    toast.success('User updated successfully.');
    return (await response.json()) as User;
  } catch (error) {
    toast.error(
      'Error updating user: ' +
        (error instanceof Error ? error.message : 'Unknown error'),
    );
    return null;
  }
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  const authServiceUrl = getAuthServiceUrl();
  if (!authServiceUrl) return false;

  try {
    const response = await fetch(`${authServiceUrl}/users/${userId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      toast.success('User deleted successfully.');
      return true;
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Unknown error');
    }
  } catch (error) {
    toast.error(
      'Error deleting user: ' +
        (error instanceof Error ? error.message : 'Unknown error'),
    );
    return false;
  }
};
