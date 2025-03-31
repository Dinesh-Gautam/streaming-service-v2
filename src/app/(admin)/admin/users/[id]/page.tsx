'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

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

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  role: z.string().min(1, {
    message: 'Please select a role.',
  }),
});

// Mock user data
const users = [
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

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const isNewUser = userId === 'new';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      role: '',
    },
  });

  useEffect(() => {
    if (!isNewUser) {
      const user = users.find((u) => u.id === userId);
      if (user) {
        form.reset({
          name: user.name,
          email: user.email,
          role: user.role,
        });
      }
    }
  }, [userId, isNewUser, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    // In a real app, you would save the data to your backend
    console.log(values);
    router.push('/users');
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
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Editor">Editor</SelectItem>
                        <SelectItem value="Viewer">Viewer</SelectItem>
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
                  onClick={() => router.push('/users')}
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
