'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy } from 'lucide-react';
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
import { Progress } from '@/admin/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/admin/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/admin/components/ui/tabs';
import { Textarea } from '@/admin/components/ui/textarea';

const genreItems = [
  { id: 'action', label: 'Action' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'drama', label: 'Drama' },
  { id: 'horror', label: 'Horror' },
  { id: 'sci-fi', label: 'Sci-Fi' },
  { id: 'thriller', label: 'Thriller' },
  { id: 'crime', label: 'Crime' },
  { id: 'romance', label: 'Romance' },
  { id: 'documentary', label: 'Documentary' },
  { id: 'animation', label: 'Animation' },
];

const formSchema = z.object({
  title: z.string().min(2, {
    message: 'Title must be at least 2 characters.',
  }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
  year: z.coerce
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear(), {
      message: `Year must be between 1900 and ${new Date().getFullYear()}.`,
    }),
  genres: z.array(z.string()).min(1, {
    message: 'Please select at least one genre.',
  }),
  status: z.string().min(1, {
    message: 'Please select a status.',
  }),
  videoUrl: z.string().optional(),
  posterUrl: z.string().optional(),
  backdropUrl: z.string().optional(),
});

// Mock movie data
const movies = [
  {
    id: '1',
    title: 'The Shawshank Redemption',
    description:
      'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    year: 1994,
    genres: ['Drama'],
    status: 'Published',
    videoUrl: 'https://example.com/videos/shawshank.mpd',
    posterUrl: '/placeholder.svg?height=600&width=400',
    backdropUrl: '/placeholder.svg?height=1080&width=1920',
    transcodingProgress: 100,
  },
  {
    id: '2',
    title: 'The Godfather',
    description:
      'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
    year: 1972,
    genres: ['Crime', 'Drama'],
    status: 'Published',
    videoUrl: 'https://example.com/videos/godfather.mpd',
    posterUrl: '/placeholder.svg?height=600&width=400',
    backdropUrl: '/placeholder.svg?height=1080&width=1920',
    transcodingProgress: 100,
  },
  {
    id: '3',
    title: 'The Dark Knight',
    description:
      'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    year: 2008,
    genres: ['Action', 'Crime', 'Drama'],
    status: 'Published',
    videoUrl: 'https://example.com/videos/dark-knight.mpd',
    posterUrl: '/placeholder.svg?height=600&width=400',
    backdropUrl: '/placeholder.svg?height=1080&width=1920',
    transcodingProgress: 100,
  },
  {
    id: '4',
    title: 'Pulp Fiction',
    description:
      'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
    year: 1994,
    genres: ['Crime', 'Drama'],
    status: 'Draft',
    videoUrl: 'https://example.com/videos/pulp-fiction.mpd',
    posterUrl: '/placeholder.svg?height=600&width=400',
    backdropUrl: '/placeholder.svg?height=1080&width=1920',
    transcodingProgress: 75,
  },
  {
    id: '5',
    title: 'Fight Club',
    description:
      'An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.',
    year: 1999,
    genres: ['Drama'],
    status: 'Draft',
    videoUrl: '',
    posterUrl: '/placeholder.svg?height=600&width=400',
    backdropUrl: '/placeholder.svg?height=1080&width=1920',
    transcodingProgress: 0,
  },
];

export default function EditMoviePage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;
  const isNewMovie = movieId === 'new';

  const [transcodingProgress, setTranscodingProgress] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [backdropFile, setBackdropFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      year: new Date().getFullYear(),
      genres: [],
      status: 'Draft',
      videoUrl: '',
      posterUrl: '',
      backdropUrl: '',
    },
  });

  useEffect(() => {
    if (!isNewMovie) {
      const movie = movies.find((m) => m.id === movieId);
      if (movie) {
        form.reset({
          title: movie.title,
          description: movie.description,
          year: movie.year,
          genres: movie.genres,
          status: movie.status,
          videoUrl: movie.videoUrl,
          posterUrl: movie.posterUrl,
          backdropUrl: movie.backdropUrl,
        });
        setTranscodingProgress(movie.transcodingProgress || 0);
      }
    }
  }, [movieId, isNewMovie, form]);

  // Simulate transcoding progress
  useEffect(() => {
    if (videoFile && transcodingProgress < 100) {
      const interval = setInterval(() => {
        setTranscodingProgress((prev) => {
          const newProgress = prev + 5;
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [videoFile, transcodingProgress]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    // In a real app, you would save the data to your backend
    console.log(values);
    console.log('Video file:', videoFile);
    console.log('Poster file:', posterFile);
    console.log('Backdrop file:', backdropFile);
    router.push('/movies');
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
      setTranscodingProgress(5); // Start progress

      // In a real app, you would upload the file and get a URL back
      const fakeUrl = `https://example.com/videos/${Date.now()}.mpd`;
      form.setValue('videoUrl', fakeUrl);
    }
  };

  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPosterFile(e.target.files[0]);

      // In a real app, you would upload the file and get a URL back
      const fakeUrl = `/placeholder.svg?height=600&width=400&text=${e.target.files[0].name}`;
      form.setValue('posterUrl', fakeUrl);
    }
  };

  const handleBackdropUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBackdropFile(e.target.files[0]);

      // In a real app, you would upload the file and get a URL back
      const fakeUrl = `/placeholder.svg?height=1080&width=1920&text=${e.target.files[0].name}`;
      form.setValue('backdropUrl', fakeUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        {isNewMovie ? 'Create Movie' : 'Edit Movie'}
      </h1>

      <Tabs
        defaultValue="details"
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>
                {isNewMovie ? 'Add a new movie' : 'Update movie details'}
              </CardTitle>
              <CardDescription>
                Fill in the information below to{' '}
                {isNewMovie ?
                  'create a new movie entry'
                : "update the movie's information"}
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

                  <FormField
                    control={form.control}
                    name="genres"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>Genres</FormLabel>
                          <FormDescription>
                            Select all genres that apply to this movie.
                          </FormDescription>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {genreItems.map((item) => (
                            <FormField
                              key={item.id}
                              control={form.control}
                              name="genres"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(
                                          item.label,
                                        )}
                                        onCheckedChange={(checked) => {
                                          const currentValue = [
                                            ...(field.value || []),
                                          ];
                                          if (checked) {
                                            field.onChange([
                                              ...currentValue,
                                              item.label,
                                            ]);
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
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
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

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/movies')}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {isNewMovie ? 'Create Movie' : 'Update Movie'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media">
          <Card>
            <CardHeader>
              <CardTitle>Media Files</CardTitle>
              <CardDescription>
                Upload video, poster, and backdrop images for this movie.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Video Upload */}
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <h3 className="text-lg font-medium">Video File</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload an MP4 video file. It will be automatically
                    transcoded to MPD format.
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="video/mp4"
                        onChange={handleVideoUpload}
                        className="cursor-pointer"
                      />
                    </div>
                    {videoFile && (
                      <div className="text-sm text-muted-foreground">
                        {videoFile.name} (
                        {Math.round((videoFile.size / 1024 / 1024) * 10) / 10}{' '}
                        MB)
                      </div>
                    )}
                  </div>

                  {transcodingProgress > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Transcoding Progress</span>
                        <span>{transcodingProgress}%</span>
                      </div>
                      <Progress
                        value={transcodingProgress}
                        className="h-2"
                      />
                    </div>
                  )}

                  {form.watch('videoUrl') && transcodingProgress === 100 && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <div className="flex-1 text-sm truncate">
                        {form.watch('videoUrl')}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(form.watch('videoUrl') || '')
                        }
                      >
                        {isCopied ?
                          <Check className="h-4 w-4 mr-1" />
                        : <Copy className="h-4 w-4 mr-1" />}
                        {isCopied ? 'Copied' : 'Copy URL'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Poster Upload */}
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <h3 className="text-lg font-medium">Poster Image</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a poster image (recommended size: 400x600px).
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handlePosterUpload}
                      className="cursor-pointer"
                    />
                  </div>

                  {form.watch('posterUrl') && (
                    <div className="flex justify-center">
                      <div className="relative w-[150px] h-[225px] border rounded-md overflow-hidden">
                        <img
                          src={form.watch('posterUrl') || '/placeholder.svg'}
                          alt="Movie poster"
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Backdrop Upload */}
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <h3 className="text-lg font-medium">Backdrop Image</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a backdrop image (recommended size: 1920x1080px).
                  </p>
                </div>

                <div className="grid gap-4">
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleBackdropUpload}
                      className="cursor-pointer"
                    />
                  </div>

                  {form.watch('backdropUrl') && (
                    <div className="flex justify-center">
                      <div className="relative w-full h-[200px] border rounded-md overflow-hidden">
                        <img
                          src={form.watch('backdropUrl') || '/placeholder.svg'}
                          alt="Movie backdrop"
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
