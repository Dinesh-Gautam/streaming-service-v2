import Link from 'next/link';

import { PlusCircle } from 'lucide-react';

import { Button } from '@/admin/components/ui/button';
import { PATHS } from '@/constants/paths';

import { UsersTable } from './users-table';

export default function UsersPage() {
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
      <UsersTable />
    </div>
  );
}
