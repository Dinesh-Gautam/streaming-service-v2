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
  getMediaProcessingJob, // Changed import
  processVideo,
  saveMovieData,
  uploadAction,
  type MediaProcessingStatus, // Import the status type
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
  // transcodingStarted prop is no longer needed, status is fetched
}: {
  defaultValues?: z.infer<typeof formSchema>;
  isNewMovie: boolean;
  id: string; // This is the mediaId
}) {
  const router = useRouter();

  // State to hold the entire processing job status
  const [processingStatus, setProcessingStatus] =
    useState<MediaProcessingStatus>({
      jobStatus: 'pending',
      tasks: [],
      jobExists: false, // Assume not started until first fetch
    });
  const [isPolling, setIsPolling] = useState(false); // To manage interval lifecycle
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

  const mediaId = form.watch('media.video.id');

  // Effect to poll for processing status
  useEffect(() => {
    if (!mediaId) {
      console.error(
        'Error getting MediaId, which is required for getting the progress data',
      );
    }

    let intervalId: NodeJS.Timeout | null = null;

    const fetchStatus = async () => {
      if (!mediaId) return; // Don't fetch if ID isn't available yet

      try {
        const { [mediaId]: status } = await getMediaProcessingJob(mediaId);

        setProcessingStatus(status);

        // Stop polling if job is completed or failed
        if (status.jobStatus === 'completed' || status.jobStatus === 'failed') {
          if (intervalId) clearInterval(intervalId);
          setIsPolling(false);
        } else if (
          !isPolling &&
          status.jobExists &&
          status.jobStatus !== 'pending'
        ) {
          // Start polling only if job exists and is running
          setIsPolling(true);
        }
      } catch (error) {
        console.error('Error fetching media processing status:', error);
        // Optionally set an error state for the whole polling mechanism
        if (intervalId) clearInterval(intervalId);
        setIsPolling(false);
      }
    };

    // Fetch immediately on mount or when mediaId changes
    fetchStatus();

    // Set up polling interval if the job is potentially running
    if (isPolling) {
      intervalId = setInterval(fetchStatus, 1000); // Poll every 1 seconds
    }

    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
    // Dependencies: mediaId ensures refetch if ID changes, isPolling manages interval lifecycle
  }, [mediaId, isPolling]);

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

    // Call the action, but don't await - let it run in background
    processVideo(videoPath, id)
      .then((res) => {
        if (res.success) {
          console.log('Processing initiated via action.');
          // Start polling immediately after successful initiation
          setIsPolling(true);
        } else {
          console.error('Failed to initiate processing:', res.message);
          // Optionally set a general error state here
        }
      })
      .catch((err) => {
        console.error('Error calling processVideo action:', err);
        // Optionally set a general error state here
      });
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
                          {/* Show Start Processing button if video exists and job hasn't started or has failed */}
                          {OriginalPaths.video &&
                            (!processingStatus.jobExists ||
                              processingStatus.jobStatus === 'pending' ||
                              processingStatus.jobStatus === 'failed') && (
                              <div>
                                <Button
                                  onClick={videoProcessHandler}
                                  disabled={
                                    processingStatus.jobStatus === 'running'
                                  } // Disable if already running from a previous attempt
                                >
                                  {processingStatus.jobStatus === 'failed' ?
                                    'Retry Processing'
                                  : 'Start Processing'}
                                </Button>
                              </div>
                            )}
                        </>
                      )
                    }
                  </div>

                  {/* Display progress for each task */}
                  {processingStatus.jobExists &&
                    processingStatus.tasks.length > 0 && (
                      <div className="space-y-4 pt-4 border-t">
                        <h4 className="text-md font-medium">
                          Processing Status:{' '}
                          <span
                            className={`capitalize font-semibold ${
                              processingStatus.jobStatus === 'completed' ?
                                'text-green-600'
                              : processingStatus.jobStatus === 'failed' ?
                                'text-red-600'
                              : processingStatus.jobStatus === 'running' ?
                                'text-blue-600'
                              : 'text-muted-foreground'
                            }`}
                          >
                            {processingStatus.jobStatus}
                          </span>
                        </h4>
                        {processingStatus.tasks.map((task) => (
                          <div
                            key={task.taskId}
                            className="space-y-2"
                          >
                            <div className="flex justify-between text-sm font-medium">
                              {/* Make engine name more readable */}
                              <span>
                                {task.engine
                                  .replace('Engine', '')
                                  .replace(/([A-Z])/g, ' $1')
                                  .trim()}{' '}
                                Status
                              </span>
                              <span
                                className={`capitalize ${
                                  task.status === 'completed' ? 'text-green-500'
                                  : task.status === 'failed' ? 'text-red-500'
                                  : task.status === 'running' ? 'text-blue-500'
                                  : 'text-muted-foreground'
                                }`}
                              >
                                {task.status}
                              </span>
                            </div>
                            {(
                              task.status === 'running' ||
                              task.status === 'completed' ||
                              (task.status === 'failed' && task.progress > 0)
                            ) ?
                              <>
                                <Progress
                                  value={task.progress}
                                  className={`h-2 ${task.status === 'failed' ? 'bg-red-200 [&>*]:bg-red-500' : ''}`}
                                />
                                <div className="flex justify-end text-xs text-muted-foreground">
                                  <span>{task.progress.toFixed(1)}%</span>
                                </div>
                              </>
                            : null}
                            {task.status === 'failed' && task.error && (
                              <p className="text-xs text-red-500">
                                Error: {task.error}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Show Copy URL button only if the overall job is complete */}
                  {processingStatus.jobStatus === 'completed' && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md mt-4">
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
