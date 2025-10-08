'use client';

import React, { useState } from 'react';

import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

import type { MovieSchema } from '@/lib/validation/schemas';

import { Button } from '@/admin/components/ui/button';
// Added useCallback

import { Checkbox } from '@/admin/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from '@/admin/components/ui/textarea';

interface MovieDetailsFormProps {
  form: UseFormReturn<z.infer<typeof MovieSchema>>;
  genreItems: { id: string; label: string }[];
  setGenreItems: React.Dispatch<
    React.SetStateAction<{ id: string; label: string }[]>
  >;
}

export function MovieDetailsForm({
  form,
  genreItems,
  setGenreItems,
}: MovieDetailsFormProps) {
  return (
    <Form {...form}>
      <div className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter movie title"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter movie description"
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Year</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <GenreManager
          form={form}
          genreItems={genreItems}
          setGenreItems={setGenreItems}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? 'Draft'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Published">Published</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
}

interface GenreManagerProps {
  form: UseFormReturn<z.infer<typeof MovieSchema>>;
  genreItems: { id: string; label: string }[];
  setGenreItems: React.Dispatch<
    React.SetStateAction<{ id: string; label: string }[]>
  >;
}

function GenreManager({ form, genreItems, setGenreItems }: GenreManagerProps) {
  const [customGenreInput, setCustomGenreInput] = useState('');

  const handleAddCustomGenre = () => {
    const newGenreLabel = customGenreInput.trim();
    if (
      newGenreLabel &&
      !genreItems.some(
        (g) => g.label.toLowerCase() === newGenreLabel.toLowerCase(),
      )
    ) {
      const newGenre = {
        id: newGenreLabel.toLowerCase().replace(/\s+/g, '-'),
        label: newGenreLabel,
      };
      setGenreItems((prev) => [...prev, newGenre]);
      const currentGenres = form.getValues('genres') || [];
      form.setValue('genres', [...currentGenres, newGenre.label]);
      setCustomGenreInput('');
    } else if (newGenreLabel) {
      const currentGenres = form.getValues('genres') || [];
      if (!currentGenres.includes(newGenreLabel)) {
        form.setValue('genres', [...currentGenres, newGenreLabel]);
      }
      setCustomGenreInput('');
    }
  };

  return (
    <FormField
      control={form.control}
      name="genres"
      render={() => (
        <FormItem>
          <div className="mb-4">
            <FormLabel>Genres</FormLabel>
            <FormDescription>
              Select all genres that apply, or add a custom one below.
            </FormDescription>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {genreItems.map((item) => (
              <FormField
                key={item.label}
                control={form.control}
                name="genres"
                render={({ field }) => (
                  <FormItem
                    key={item.id}
                    className="flex flex-row items-start space-x-3 space-y-0"
                  >
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(item.label)}
                        onCheckedChange={(checked) => {
                          const currentValue = field.value || [];
                          if (checked) {
                            field.onChange([...currentValue, item.label]);
                          } else {
                            field.onChange(
                              currentValue.filter(
                                (value) => value !== item.label,
                              ),
                            );
                          }
                        }}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      {item.label}
                    </FormLabel>
                  </FormItem>
                )}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Input
              type="text"
              placeholder="Add custom genre..."
              value={customGenreInput}
              onChange={(e) => setCustomGenreInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomGenre();
                }
              }}
              className="flex-grow"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddCustomGenre}
            >
              Add Genre
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
