import User from '@/server/db/schemas/user';

export async function getAllUsers() {
  const users = await User.find({})
    .select({ name: true, email: true, role: true, creationDate: true })
    .limit(20);

  return users.map((user) => {
    const plainUser = user.toObject();
    return {
      ...plainUser,
      id: plainUser._id.toString(),
    };
  });
}
