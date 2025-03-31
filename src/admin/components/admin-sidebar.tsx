'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Film, Home, Users } from 'lucide-react';

import { ThemeToggle } from '@/admin/components/theme-toggle';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/admin/components/ui/sidebar';
import { PATHS } from '@/constants/paths';

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
    >
      <SidebarHeader className="border-b">
        <div className="flex items-center p-2 font-semibold">Admin Panel</div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive(PATHS.ADMIN.ROOT)}
            >
              <Link href={PATHS.ADMIN.ROOT}>
                <Home className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive(PATHS.ADMIN.USERS)}
            >
              <Link href={PATHS.ADMIN.USERS}>
                <Users className="mr-2 h-4 w-4" />
                <span>Users</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive(PATHS.ADMIN.MOVIES)}
            >
              <Link href={PATHS.ADMIN.MOVIES}>
                <Film className="mr-2 h-4 w-4" />
                <span>Movies</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t p-2">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Admin Panel v0.2</div>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
