'use client';

import { useParams } from 'next/navigation';

import { Skeleton } from '@/admin/components/ui/skeleton';
import { useUsers } from '@/admin/hooks/use-users';

import EditUser from './edit-user';

function EditUserWrapper({ userId }: { userId: string }) {
  const { user, error, isLoading } = useUsers(userId);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <EditUser
      user={user}
      userId={userId}
    />
  );
}

export default function EditUserPage() {
  const params = useParams();
  const { id } = params;
  const userId = Array.isArray(id) ? id[0] : id;

  if (!userId) {
    return <p>User not found.</p>;
  }

  return <EditUserWrapper userId={userId} />;
}
