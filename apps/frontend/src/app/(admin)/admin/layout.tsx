import { Roboto } from 'next/font/google';

import type { Metadata } from 'next';
import type React from 'react';

import '@/styles/admin.css';

import { AdminSidebar } from '@/admin/components/admin-sidebar';
import { ThemeProvider } from '@/admin/components/theme-provider';
import { SidebarProvider } from '@/admin/components/ui/sidebar';

const inter = Roboto({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Admin Panel',
  description: 'Admin panel for managing users and movies',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
