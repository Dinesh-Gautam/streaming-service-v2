'use client';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/admin/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/admin/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/admin/components/ui/form';
import { Input } from '@/admin/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/admin/components/ui/select';
import { userAction } from '@/app/(admin)/admin/users/_actions';
import { PATHS } from '@/constants/paths';
import { USER_ROLES } from '@/lib/types';
import {
  UserSchema as formSchema,
  type UserSchemaType,
} from '@/lib/validation/schemas';

export default function EditUser({
  user,
  userId,
}: {
  user: UserSchemaType | null;
  userId: string;
}) {
  const router = useRouter();
  const isNewUser = userId === 'new';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: user || {
      name: '',
      email: '',
      role: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await userAction(
      values,
      userId,
      isNewUser ? 'create' : 'update',
    );

    if (!res.success && 'message' in res) {
      console.error(res.message);
      return;
    }

    router.push(PATHS.ADMIN.USERS);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        {isNewUser ? 'Create User' : 'Edit User'}
      </h1>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>
            {isNewUser ? 'Add a new user' : 'Update user details'}
          </CardTitle>
          <CardDescription>
            Fill in the information below to{' '}
            {isNewUser ?
              'create a new user account'
            : "update the user's information"}
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter full name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isNewUser && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(USER_ROLES).map((role) => (
                          <SelectItem
                            key={role}
                            value={role}
                          >
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(PATHS.ADMIN.USERS)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {isNewUser ? 'Create User' : 'Update User'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
