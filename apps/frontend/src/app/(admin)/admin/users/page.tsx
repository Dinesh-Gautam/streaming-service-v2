'use client';

import Link from 'next/link';

import { PlusCircle } from 'lucide-react';

import { Button } from '@/admin/components/ui/button';
import { Skeleton } from '@/admin/components/ui/skeleton';
import { useUsers } from '@/admin/hooks/use-users';
import { PATHS } from '@/constants/paths';

import { UsersTable } from './users-table';

export default function UsersPage() {
  const { users, error, isLoading, refetch } = useUsers();

  console.log(error, isLoading);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users Management</h1>
        <Button asChild>
          <Link href={PATHS.ADMIN.NEW_USER}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
          </Link>
        </Button>
      </div>
      {isLoading && <Skeleton className="h-96 w-full" />}
      {error && <p className="text-red-500">{error}</p>}

      {!isLoading &&
        !error &&
        (users ?
          <UsersTable
            users={users}
            refetch={refetch}
          />
        : <p>No users found.</p>)}
    </div>
  );
}
