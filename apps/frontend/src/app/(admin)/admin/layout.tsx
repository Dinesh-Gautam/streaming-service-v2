import { Roboto } from 'next/font/google';

import type { Metadata } from 'next';
import type React from 'react';

import '@/styles/admin.css';

import { cookies } from 'next/headers';
import { forbidden, redirect, unauthorized } from 'next/navigation';

import { AdminSidebar } from '@/admin/components/admin-sidebar';
import { ThemeProvider } from '@/admin/components/theme-provider';
import { SidebarProvider } from '@/admin/components/ui/sidebar';
import { PATHS } from '@/constants/paths';
import { TokenService } from '@monorepo/token';

const inter = Roboto({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Admin Panel',
  description: 'Admin panel for managing users and movies',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken');

  if (!token)
    return redirect(PATHS.SIGN_IN + '?callbackUrl=' + PATHS.ADMIN.ROOT);

  const tokenService = new TokenService(process.env.JWT_SECRET!);
  const isAdmin = tokenService.isUserAdmin(token.value);

  if (!isAdmin) return unauthorized();

  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <AdminSidebar />
              <main className="flex-1">{children}</main>
            </div>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
