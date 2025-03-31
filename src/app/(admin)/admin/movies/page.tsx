import Link from 'next/link';

import { PlusCircle } from 'lucide-react';

import { Button } from '@/admin/components/ui/button';
import { PATHS } from '@/constants/paths';

import { MoviesTable } from './movies-table';

export default function MoviesPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Movies Management</h1>
        <Button asChild>
          <Link href={PATHS.ADMIN.NEW_MOVIE}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Movie
          </Link>
        </Button>
      </div>
      <MoviesTable />
    </div>
  );
}
