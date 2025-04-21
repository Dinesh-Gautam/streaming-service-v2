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
import { Check, Copy, Sparkles } from 'lucide-react';
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

import MediaUploadSection from './components/MediaUploadSection';
import SegmentedProgressBar, {
  SparkelIcon,
} from './components/SegmentedProgressBar';
import { AIEngineOutput } from '@/lib/media/engine-outputs';

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

// const mockTasks: MediaProcessingStatus['tasks'] = [
//   {
//     taskId: '1',
//     engine: 'AIEngine',
//     status: 'pending',
//     progress: 0,
//   },
//   {
//     taskId: '2',
//     engine: 'SubtitleEngine',
//     status: 'pending',
//     progress: 0,
//   },
//   {
//     taskId: '3',
//     engine: 'TranscodingEngine',
//     status: 'pending',
//     progress: 0,
//   },
//   {
//     taskId: '4',
//     engine: 'ThumbnailEngine',
//     status: 'pending',
//     progress: 0,
//   },
// ];

// let index = 0;

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

  // // const tasks = processingStatus.tasks;
  // const [tasks, setTasks] = useState(mockTasks);
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (index < mockTasks.length) {

  //       const progress = tasks[index].progress;
  //       if (index == 1 && progress >= 50) {
  //         clearInterval(interval);
  //         setTasks(prev => {
  //           const newTasks = [...prev];
  //           newTasks[index].status = 'failed';
  //           newTasks[index].error = 'This is a test error';
  //           return newTasks;
  //         });
  //         return;
  //       }
  //       console.log('progress', progress);

  //       if (progress < 100) {
  //         setTasks(prev => {
  //           const newTasks = [...prev];
  //           newTasks[index].status = 'running';
  //           newTasks[index].progress = progress + 1;
  //           return newTasks;
  //         });
  //       } else {
  //         setTasks(prev => {
  //           const newTasks = [...prev];
  //           newTasks[index].status = 'completed';
  //           index++;
  //           return newTasks;
  //         });
  //       }
  //     }

  //   }, 10);
  // }, []);

  // console.log('tasks', tasks);

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
              {/* Video Upload Section */}
              <MediaUploadSection
                mediaType="video"
                title="Video File"
                description="Upload an MP4 video file. It will be automatically transcoded to MPD format."
                accept="video/mp4"
                originalPath={OriginalPaths.video}
                isUploading={videoUploadingPending}
                onFileChange={(e) => handelMediaUpload(e, 'video')}
                file={mediaFiles.video}
              >
                {OriginalPaths.video && (
                  <div className="space-y-4">
                    <video
                      className="w-full max-w-3xl h-auto rounded-md"
                      controls
                      src={'/api/static/' + OriginalPaths.video}
                    />

                    {(
                      !processingStatus.jobExists ||
                      processingStatus.jobStatus === 'pending' ||
                      processingStatus.jobStatus === 'failed'
                    ) ?
                      <Button
                        onClick={videoProcessHandler}
                        disabled={processingStatus.jobStatus === 'running'}
                      >
                        {processingStatus.jobStatus === 'failed' ?
                          'Retry Processing'
                          : 'Start Processing'}
                      </Button>
                      : null}

                    {processingStatus.jobExists && (
                      <SegmentedProgressBar
                        tasks={processingStatus.tasks}
                        jobStatus={processingStatus.jobStatus}
                      />
                    )}

                    {processingStatus.jobStatus === 'completed' && (
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
                )}
              </MediaUploadSection>

              {/* Poster Upload Section */}
              <MediaUploadSection
                mediaType="poster"
                title="Poster Image"
                description="Upload a poster image (recommended size: 400x600px)."
                accept="image/*"
                originalPath={OriginalPaths.poster}
                isUploading={posterUploadPending}
                onFileChange={(e) => handelMediaUpload(e, 'poster')}
                file={mediaFiles.poster}
              />

              {/* Backdrop Upload Section */}
              <MediaUploadSection
                mediaType="backdrop"
                title="Backdrop Image"
                description="Upload a backdrop image (recommended size: 1920x1080px)."
                accept="image/*"
                originalPath={OriginalPaths.backdrop}
                isUploading={backdropUploadPending}
                onFileChange={(e) => handelMediaUpload(e, 'backdrop')}
                file={mediaFiles.backdrop}
              />

              {/* AI Suggestions Section */}
              <AiSuggestions tasks={processingStatus.tasks} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-4 mt-6">
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

    </div>
  );
}

function AiSuggestions({ tasks }: { tasks: MediaProcessingStatus['tasks'] }) {
  const aiTask = tasks.find(
    (t) => t.engine === 'AIEngine' && t.status === 'completed',
  );

  if (!aiTask) return null;

  const { title, description, genres } = (aiTask.output as AIEngineOutput)?.data || {};

  return (
    <div className="mt-4 p-4 border rounded-md bg-muted/30">
      <h5 className="font-semibold mb-2 flex items-center gap-2">
        <SparkelIcon />
        AI Generated Suggestions
      </h5>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          AI has analyzed your video and generated the following suggestions:
        </p>
        <div className="grid gap-4">
          {
            title && (
              <div className="p-3 bg-background rounded-md">
                <h6 className="text-sm font-medium mb-1">Title Suggestion</h6>
                <p className="text-sm text-muted-foreground">{title}</p>
              </div>
            )
          }
          {
            description && (
              <div className="p-3 bg-background rounded-md">
                <h6 className="text-sm font-medium mb-1">Description Suggestion</h6>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            )
          }
          {
            genres && genres.length > 0 && (
              <div className="p-3 bg-background rounded-md">
                <h6 className="text-sm font-medium mb-1">Genre Suggestions</h6>
                <p className="text-sm text-muted-foreground">{genres.join(', ')}</p>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}
