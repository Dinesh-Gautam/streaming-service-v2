'use client';

import { useCallback, useEffect, useState } from 'react';

import { getUserById, getUsers } from '@/admin/api/user-api';
import { User } from '@/lib/types';

export function useUsers(id?: string) {
  const [data, setData] = useState<User | User[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (id) {
        if (id === 'new') {
          setData(null);
        } else {
          const result = await getUserById(id);
          setData(result);
        }
      } else {
        const result = await getUsers();
        setData(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    user: data as User | null,
    users: (data as User[]) || [],
    isLoading,
    error,
    refetch: fetchData,
  };
}
