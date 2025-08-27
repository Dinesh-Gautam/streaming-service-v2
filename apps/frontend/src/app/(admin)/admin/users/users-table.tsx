'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Edit, MoreHorizontal, Trash } from 'lucide-react';

import { Button } from '@/admin/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/admin/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/admin/components/ui/table';
import { userAction } from '@/app/(admin)/admin/users/_actions';
import { PATHS } from '@/constants/paths';
import type { User } from '@/lib/types';

import { DeleteUserDialog } from './delete-user-dialog';

// Mock data for users
const initialUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Editor' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'Viewer' },
  { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'Editor' },
  {
    id: '5',
    name: 'Charlie Wilson',
    email: 'charlie@example.com',
    role: 'Viewer',
  },
];

export function UsersTable({ users: _users }: { users: User[] }) {
  const [users, setUsers] = useState(_users);

  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const handleDeleteUser = async (id: string) => {
    const res = await userAction(null, id, 'delete');

    if (res.success) {
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== id));
    }
  };

  return (
    <>
      <div className="w-full overflow-auto">
        <Table className="w-full">
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-b border-muted">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Creation Date</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.id}
                className="border-b border-muted/50 hover:bg-muted/30"
              >
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.creationDate.toDateString()}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={PATHS.ADMIN.USERS + `/${user.id}`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setUserToDelete(user.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DeleteUserDialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={() => userToDelete && handleDeleteUser(userToDelete)}
      />
    </>
  );
}
