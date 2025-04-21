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

  // Use Sparkles from lucide-react as the AI indicator icon
  const AiIcon: React.ElementType = Sparkles;

  const tasks = processingStatus.tasks;
  // const [tasks, setTasks] = useState(mockTasks);
  // useEffect(() => {
  //   setInterval(() => {
  //     if (index < mockTasks.length) {

  //       const progress = tasks[index].progress;
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

  //   }, 100);
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
                  {
                    processingStatus.jobExists &&
                    tasks.length > 0 && (
                      <div className="space-y-2 pt-4 border-t">
                        {/* Dynamic Title */}
                        <div className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                          {(() => {
                            const totalTasks = tasks.length;
                            // Find the first task that is not 'completed'
                            let currentTaskIndex =
                              tasks.findIndex(
                                (task) => task.status !== 'completed', // Removed 'skipped' comparison
                              );
                            // If all tasks are completed, show the last one as current
                            if (currentTaskIndex === -1) {
                              currentTaskIndex = totalTasks - 1;
                            }
                            const currentTask =
                              tasks[currentTaskIndex];
                            const names = {
                              "AIEngine": "Generating Metadata",
                              "SubtitleEngine": "Generating Subtitles",
                              "TranscodingEngine": "Transcoding",
                              "ThumbnailEngine": "Generating Thumbnails",
                            }
                            const taskName = names[currentTask.engine as keyof typeof names] || currentTask.engine;

                            const statuses = {
                              "completed": "Completed",
                              "failed": "Failed",
                              "running": "Running",
                              "pending": "Pending",
                            }

                            // Determine overall status display
                            let statusText: string = tasks[currentTaskIndex].status; // Explicitly type as string
                            let statusColor = 'text-muted-foreground';

                            return (
                              <div className="flex w-full gap-2 align-baseline mb-0.5">
                                <span>
                                  {currentTaskIndex + 1}/{totalTasks} {' '}
                                </span>
                                {
                                  currentTask.engine === 'AIEngine' && (
                                    <SparkelIcon />
                                  )
                                }

                                <span className={`capitalize font-semibold text-primary `}>
                                  {taskName}
                                </span>
                                {/* <span className={`capitalize ${statusColor}`}>
                                  {' - '} {statuses[statusText as keyof typeof statuses]}
                                </span> */}
                              </div>
                            );
                          })()}
                        </div >

                        {/* Segmented Bar Container */}
                        <div className="flex w-full space-x-1 h-3 rounded-full" >
                          {
                            tasks.map((task, indexs) => {
                              const bgColor = "bg-secondary";
                              const outlineClass = "";
                              const progressColor =
                                task.engine === "AIEngine" ?
                                  "bg-gradient-to-r from-pink-500 to-red-500" :
                                  "bg-primary";
                              const progress = task.progress;

                              return (
                                <div
                                  key={task.taskId}
                                  title={`${task.engine.replace('Engine', '').replace(/([A-Z])/g, ' $1').trim()}: ${task.status} (${task.progress.toFixed(1)}%)`}
                                  className={`flex-1 h-full rounded-full overflow-hidden relative ${bgColor} ${outlineClass}`}
                                >
                                  <div
                                    className={`h-full rounded-full absolute top-0 left-0 ${progressColor}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              );
                            })
                          }
                        </div>

                        {/* Optional: Display individual task errors if the job failed */}
                        {processingStatus.jobStatus === 'failed' && (
                          <div className="pt-2 space-y-1">
                            {processingStatus.tasks.filter(t => t.status === 'failed' && t.error).map(task => (
                              <p key={`${task.taskId}-error`} className="text-xs text-red-500">
                                <strong>{task.engine.replace('Engine', '').replace(/([A-Z])/g, ' $1').trim()} Error:</strong> {task.error}
                              </p>
                            ))}
                          </div>
                        )}
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

              {/* Optionally display AI generated data */}
              {processingStatus.tasks.find(t => t.engine === 'AIEngine' && t.status === 'completed') && (
                <div className="mt-4 p-4 border rounded-md bg-muted/30">
                  <h5 className="font-semibold mb-2 flex items-center">
                    <AiIcon className="h-5 w-5 mr-2 text-purple-500" />
                    AI Generated Suggestions
                  </h5>
                  {/* TODO: Display AI output (title, description, genres etc.)
                     Maybe add buttons to apply suggestions to form fields? */}
                  <p className="text-sm text-muted-foreground">AI data display placeholder.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SparkelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.45275 11.625C7.38579 11.3655 7.2505 11.1286 7.06096 10.939C6.87142 10.7495 6.63455 10.6142 6.375 10.5473L1.77375 9.36075C1.69525 9.33847 1.62616 9.29119 1.57696 9.22609C1.52776 9.16098 1.50114 9.08161 1.50114 9C1.50114 8.9184 1.52776 8.83902 1.57696 8.77392C1.62616 8.70882 1.69525 8.66154 1.77375 8.63925L6.375 7.452C6.63446 7.38511 6.87127 7.24993 7.0608 7.06053C7.25034 6.87113 7.38567 6.63442 7.45275 6.375L8.63925 1.77375C8.66131 1.69494 8.70854 1.62551 8.77374 1.57605C8.83894 1.52659 8.91854 1.49982 9.00038 1.49982C9.08221 1.49982 9.16181 1.52659 9.22701 1.57605C9.29221 1.62551 9.33945 1.69494 9.3615 1.77375L10.5473 6.375C10.6142 6.63456 10.7495 6.87143 10.939 7.06097C11.1286 7.25051 11.3654 7.3858 11.625 7.45275L16.2263 8.6385C16.3054 8.66033 16.3752 8.70751 16.4249 8.77281C16.4746 8.83811 16.5015 8.91792 16.5015 9C16.5015 9.08208 16.4746 9.1619 16.4249 9.2272C16.3752 9.2925 16.3054 9.33968 16.2263 9.3615L11.625 10.5473C11.3654 10.6142 11.1286 10.7495 10.939 10.939C10.7495 11.1286 10.6142 11.3655 10.5473 11.625L9.36075 16.2263C9.33869 16.3051 9.29146 16.3745 9.22626 16.424C9.16106 16.4734 9.08147 16.5002 8.99963 16.5002C8.91779 16.5002 8.83819 16.4734 8.77299 16.424C8.70779 16.3745 8.66056 16.3051 8.6385 16.2263L7.45275 11.625Z" fill="url(#paint0_linear_2_12)" />
      <path d="M15 2.25V5.25Z" fill="url(#paint1_linear_2_12)" />
      <path d="M16.5 3.75H13.5Z" fill="url(#paint2_linear_2_12)" />
      <path d="M15 2.25V5.25M16.5 3.75H13.5" stroke="url(#paint3_linear_2_12)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M3 12.75V14.25Z" fill="url(#paint4_linear_2_12)" />
      <path d="M3.75 13.5H2.25Z" fill="url(#paint5_linear_2_12)" />
      <path d="M3 12.75V14.25M3.75 13.5H2.25" stroke="url(#paint6_linear_2_12)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <defs>
        <linearGradient id="paint0_linear_2_12" x1="9.00134" y1="1.49982" x2="9.00134" y2="16.5002" gradientUnits="userSpaceOnUse">
          <stop stop-color="#D130B9" />
          <stop offset="1" stop-color="#DC3639" />
        </linearGradient>
        <linearGradient id="paint1_linear_2_12" x1="15" y1="3.75" x2="15" y2="5.25" gradientUnits="userSpaceOnUse">
          <stop stop-color="#D130B9" />
          <stop offset="1" stop-color="#EA171B" />
        </linearGradient>
        <linearGradient id="paint2_linear_2_12" x1="15" y1="3.75" x2="15" y2="5.25" gradientUnits="userSpaceOnUse">
          <stop stop-color="#D130B9" />
          <stop offset="1" stop-color="#EA171B" />
        </linearGradient>
        <linearGradient id="paint3_linear_2_12" x1="15" y1="3.75" x2="15" y2="5.25" gradientUnits="userSpaceOnUse">
          <stop stop-color="#D130B9" />
          <stop offset="1" stop-color="#EA171B" />
        </linearGradient>
        <linearGradient id="paint4_linear_2_12" x1="3" y1="13.5" x2="3" y2="15" gradientUnits="userSpaceOnUse">
          <stop stop-color="#D130B9" />
          <stop offset="1" stop-color="#DC3639" />
        </linearGradient>
        <linearGradient id="paint5_linear_2_12" x1="3" y1="13.5" x2="3" y2="15" gradientUnits="userSpaceOnUse">
          <stop stop-color="#D130B9" />
          <stop offset="1" stop-color="#DC3639" />
        </linearGradient>
        <linearGradient id="paint6_linear_2_12" x1="3" y1="13.5" x2="3" y2="15" gradientUnits="userSpaceOnUse">
          <stop stop-color="#D130B9" />
          <stop offset="1" stop-color="#DC3639" />
        </linearGradient>
      </defs>
    </svg>
  )
}