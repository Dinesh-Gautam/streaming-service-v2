import EditUser from '@/app/(admin)/admin/users/[id]/edit-user';
import { getUserById } from '@/server/db/users';

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let user = null;

  if (id !== 'new') {
    user = await getUserById(id);
  }

  return (
    <EditUser
      user={user}
      userId={id}
    />
  );
}
