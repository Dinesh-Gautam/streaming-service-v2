'use client';

import type React from 'react';
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type MouseEvent,
  type MouseEventHandler,
} from 'react';
import Image from 'next/image';
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
import {
  getTranscodingProgress,
  processVideo,
  saveMovieData,
  uploadAction,
} from '@/app/(admin)/admin/movies/_action';
import { PATHS } from '@/constants/paths';
import { MovieSchema as formSchema } from '@/lib/validation/schemas';
import { getPlaybackUrl } from '@/utils/url';

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

const mediaTypes = ['video', 'poster', 'backdrop'] as const;

type MediaTypeFileType = Record<(typeof mediaTypes)[number], File | null>;

export default function EditMoviePage({
  isNewMovie,
  defaultValues,
  id,
  transcodingStarted: _ts,
}: {
  defaultValues?: z.infer<typeof formSchema>;
  isNewMovie: boolean;
  id: string;
  transcodingStarted?: boolean;
}) {
  const router = useRouter();

  const [transcodingStarted, setTranscodingStarted] = useState(_ts || false);
  const [transcodingError, setTranscodingError] = useState<null | {
    message: string;
  }>(null);
  const [transcodingProgress, setTranscodingProgress] = useState(0);
  const [isCopied, setIsCopied] = useState(false);

  const [mediaFiles, setMediaFiles] = useState<MediaTypeFileType>(
    Object.fromEntries(
      mediaTypes.map((type) => [type, null]),
    ) as MediaTypeFileType,
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      title: '',
      description: '',
      year: new Date().getFullYear(),
      genres: [],
      status: 'Draft',
    },
  });

  useEffect(() => {
    setTranscodingError(null);

    if (transcodingStarted && transcodingProgress < 100) {
      const interval = setInterval(async () => {
        // get transcoding prgoress from server

        const videoId = form.getValues('media.video.id');

        if (!videoId) {
          clearInterval(interval);
          return;
        }

        const { progress, error } = await getTranscodingProgress(videoId);

        if (error) {
          clearInterval(interval);
          setTranscodingError({ message: error });
          return;
        }

        setTranscodingProgress((prev) => {
          if (progress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return progress;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [transcodingStarted, mediaFiles.video]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    let res;
    if (isNewMovie) {
      res = await saveMovieData(values);
    } else {
      res = await saveMovieData(values, id);
    }

    if (res.success) {
      router.push(PATHS.ADMIN.MOVIES);
    }
  }

  const [videoUploadingPending, startVideoTransition] = useTransition();
  const [posterUploadPending, startPosterTransition] = useTransition();
  const [backdropUploadPending, startBackDropTransition] = useTransition();

  const transitions = {
    video: startVideoTransition,
    poster: startPosterTransition,
    backdrop: startBackDropTransition,
  };

  const handelMediaUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'poster' | 'backdrop' | 'video',
  ) => {
    transitions[type](async () => {
      if (e.target.files && e.target.files[0]) {
        setMediaFiles((prev) => ({
          ...prev,
          [type]: e.target.files![0],
        }));

        const formData = new FormData();
        formData.append('file', e.target.files![0]);

        try {
          const res = await uploadAction(formData, type);
          if (res.success) {
            form.setValue(`media.${type}.originalPath`, res.path);
            form.setValue(`media.${type}.id`, res.id);
          }
        } catch (error) {
          console.error(`Error uploading ${type}:`, error);
        }
      }
    });
  };

  function videoProcessHandler(e: MouseEvent) {
    console.log('Video processing started');

    const [videoPath, id] = form.getValues([
      'media.video.originalPath',
      'media.video.id',
    ]);

    if (!videoPath) {
      console.error('No video file selected');
      return;
    }

    processVideo(videoPath, id);

    setTranscodingStarted(true);
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(window.location.origin + text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const OriginalPaths = {
    video: form.watch('media.video.originalPath'),
    poster: form.watch('media.poster.originalPath'),
    backdrop: form.watch('media.backdrop.originalPath'),
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
                  <div className="flex flex-col gap-4">
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="video/mp4"
                        onChange={(e) => handelMediaUpload(e, 'video')}
                        className="cursor-pointer"
                      />
                    </div>
                    {OriginalPaths.video && (
                      <video
                        className="w-full max-w-3xl h-auto rounded-md"
                        controls
                        src={'/api/static/' + OriginalPaths.video}
                      ></video>
                    )}

                    {videoUploadingPending ?
                      <span className="animate-pulse">Uploading...</span>
                    : OriginalPaths.video && (
                        <>
                          {mediaFiles.video && (
                            <div className="text-sm text-muted-foreground">
                              {mediaFiles.video.name} (
                              {Math.round(
                                (mediaFiles.video.size / 1024 / 1024) * 10,
                              ) / 10}{' '}
                              MB)
                            </div>
                          )}
                          {!transcodingStarted && (
                            <div>
                              <Button onClick={videoProcessHandler}>
                                Start Processing
                              </Button>
                            </div>
                          )}
                        </>
                      )
                    }
                  </div>

                  {transcodingError && (
                    <p className="text-sm text-red-400 whitespace-pre-wrap">
                      Error: {transcodingError.message}
                    </p>
                  )}
                  {transcodingProgress > 0 && (
                    <div className="space-y-2">
                      {transcodingProgress < 100 ?
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Transcoding Progress</span>
                            <span>{transcodingProgress.toFixed(1)}%</span>
                          </div>
                          <Progress
                            value={transcodingProgress}
                            className="h-2"
                          />
                        </>
                      : <div className="flex gap-2 text-green-400">
                          <span>Transcoding Complete</span>
                          <span>{transcodingProgress.toFixed(1)}%</span>
                        </div>
                      }
                    </div>
                  )}

                  {OriginalPaths.video && transcodingProgress === 100 && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <div className="flex-1 text-sm truncate">
                        {getPlaybackUrl(id) || ''}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(getPlaybackUrl(id) || '')
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

                <div className="flex flex-col gap-4">
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handelMediaUpload(e, 'poster')}
                      className="cursor-pointer"
                    />
                  </div>

                  {posterUploadPending ?
                    'uploading...'
                  : OriginalPaths.poster && (
                      <div className="flex">
                        <div className="relative w-[150px] h-[225px] border rounded-md overflow-hidden">
                          <Image
                            src={
                              '/api/static/' + OriginalPaths.poster ||
                              '/placeholder.svg'
                            }
                            alt="Movie poster"
                            className="object-cover w-full h-full"
                            fill
                            unoptimized
                          />
                        </div>
                      </div>
                    )
                  }
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

                <div className="flex flex-col gap-4 w-full">
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handelMediaUpload(e, 'backdrop')}
                      className="cursor-pointer"
                    />
                  </div>

                  {backdropUploadPending ?
                    'Uploading...'
                  : OriginalPaths.backdrop && (
                      <div className="flex w-full ">
                        <div className="relative w-[480px] h-[270px] border rounded-md overflow-hidden">
                          <Image
                            src={
                              '/api/static/' + OriginalPaths.backdrop ||
                              '/placeholder.svg'
                            }
                            fill
                            alt="Movie backdrop"
                            className="object-cover w-full h-full"
                            unoptimized
                          />
                        </div>
                      </div>
                    )
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
