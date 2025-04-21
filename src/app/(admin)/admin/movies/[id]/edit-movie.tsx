'use client';

import type React from 'react';
import { useEffect, useState, useTransition, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, Sparkles } from 'lucide-react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

import { Badge } from '@/admin/components/ui/badge';
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
  applyAISuggestions,
  getMediaProcessingJob,
  processVideo,
  saveMovieData,
  uploadAction,
  type MediaProcessingStatus,
} from '@/app/(admin)/admin/movies/_action';
import { ShineBorder } from '@/components/magicui/shine-border';
import { PATHS } from '@/constants/paths';
import { AIEngineOutput } from '@/lib/media/engine-outputs'; // Keep this specific import
import { MovieSchema as formSchema } from '@/lib/validation/schemas';
import { getPlaybackUrl } from '@/utils/url';

import MediaUploadSection from './components/MediaUploadSection';
import SegmentedProgressBar, {
  SparkelIcon,
} from './components/SegmentedProgressBar';

// Initial list of genres
const defaultGenreItems = [
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
}: {
  defaultValues?: z.infer<typeof formSchema>;
  isNewMovie: boolean;
  id: string; // This is the mediaId
}) {
  const router = useRouter();

  const [processingStatus, setProcessingStatus] =
    useState<MediaProcessingStatus>({
      jobStatus: 'pending',
      tasks: [],
      jobExists: false,
    });
  const [isPolling, setIsPolling] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isApplyingAISuggestions, startApplyAISuggestionsTransition] =
    useTransition();
  const [aiSuggestionsApplied, setAiSuggestionsApplied] = useState(
    defaultValues?.isAIGenerated || false,
  );
  const [genreItems, setGenreItems] = useState([...defaultGenreItems]);
  const [customGenreInput, setCustomGenreInput] = useState('');

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
      isAIGenerated: false,
    },
  });

  const mediaId = form.watch('media.video.id');

  useEffect(() => {
    if (!mediaId) {
      // console.error('MediaId missing, cannot poll for status.');
      return; // Don't proceed if no mediaId
    }

    let intervalId: NodeJS.Timeout | null = null;

    const fetchStatus = async () => {
      if (!mediaId) return;

      try {
        const { [mediaId]: status } = await getMediaProcessingJob(mediaId);
        setProcessingStatus(status);

        if (status.jobStatus === 'completed' || status.jobStatus === 'failed') {
          if (intervalId) clearInterval(intervalId);
          setIsPolling(false);
        } else if (
          !isPolling &&
          status.jobExists &&
          status.jobStatus !== 'pending'
        ) {
          setIsPolling(true);
        }
      } catch (error) {
        console.error('Error fetching media processing status:', error);
        if (intervalId) clearInterval(intervalId);
        setIsPolling(false);
      }
    };

    fetchStatus(); // Initial fetch

    if (isPolling) {
      intervalId = setInterval(fetchStatus, 5000); // Poll every 5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [mediaId, isPolling]);

  useEffect(() => {
    if (defaultValues?.genres) {
      const allGenres = new Set([
        ...defaultGenreItems.map((g) => g.label),
        ...defaultValues.genres,
      ]);
      setGenreItems(
        Array.from(allGenres).map((label) => ({
          id: label.toLowerCase().replace(/\s+/g, '-'),
          label,
        })),
      );
    }
    setAiSuggestionsApplied(defaultValues?.isAIGenerated || false);
  }, [defaultValues]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const finalValues = {
      ...values,
      genres: Array.from(new Set(values.genres || [])),
    };

    let res;
    if (isNewMovie) {
      res = await saveMovieData(finalValues);
    } else {
      res = await saveMovieData(finalValues, id);
    }

    if (res.success) {
      router.push(PATHS.ADMIN.MOVIES);
    } else {
      console.error('Failed to save movie:', res.message);
      // Consider adding user feedback here (e.g., toast notification)
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
        const file = e.target.files[0];
        setMediaFiles((prev) => ({ ...prev, [type]: file }));

        const formData = new FormData();
        formData.append('file', file);

        try {
          const res = await uploadAction(formData, type);
          if (res.success && res.path && res.id) {
            form.setValue(`media.${type}.originalPath`, res.path);
            form.setValue(`media.${type}.id`, res.id);
          } else {
            console.error(`Upload failed for ${type}:`, res);
          }
        } catch (error) {
          console.error(`Error uploading ${type}:`, error);
        }
      }
    });
  };

  function videoProcessHandler(e: MouseEvent) {
    e.preventDefault(); // Prevent potential form submission if inside form
    console.log('Video processing started');

    const videoDetails = form.getValues('media.video');

    if (!videoDetails?.originalPath || !videoDetails?.id) {
      console.error('No video file selected or ID missing');
      // Add user feedback (e.g., toast)
      return;
    }

    processVideo(videoDetails.originalPath, videoDetails.id)
      .then((res) => {
        if (res.success) {
          console.log('Processing initiated via action.');
          setIsPolling(true);
        } else {
          console.error('Failed to initiate processing:', res.message);
          // Add user feedback
        }
      })
      .catch((err) => {
        console.error('Error calling processVideo action:', err);
        // Add user feedback
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
                  id="movie-details-form"
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
                            Select all genres that apply, or add a custom one
                            below.
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
                                      checked={field.value?.includes(
                                        item.label,
                                      )}
                                      onCheckedChange={(checked) => {
                                        const currentValue = field.value || [];
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
                              )}
                            />
                          ))}
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <Input
                            type="text"
                            placeholder="Add custom genre..."
                            value={customGenreInput}
                            onChange={(e) =>
                              setCustomGenreInput(e.target.value)
                            }
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

                  {/* Hidden field for isAIGenerated - value managed by form state */}
                  <FormField
                    control={form.control}
                    name="isAIGenerated"
                    render={(
                      { field: { ref, name, onBlur, onChange } }, // Destructure field to avoid passing boolean 'value'
                    ) => (
                      <FormItem className="hidden">
                        <FormControl>
                          {/* Pass only necessary props */}
                          <input
                            type="hidden"
                            name={name}
                            ref={ref}
                            onBlur={onBlur}
                            onChange={onChange}
                          />
                        </FormControl>
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
              <MediaUploadSection
                mediaType="video"
                title="Video File"
                description="Upload an MP4 video file. It will be automatically processed."
                accept="video/mp4"
                originalPath={OriginalPaths.video}
                isUploading={videoUploadingPending}
                onFileChange={(e) => handelMediaUpload(e, 'video')}
                file={mediaFiles.video}
              >
                {OriginalPaths.video && mediaId && (
                  <div className="space-y-4">
                    <video
                      className="w-full max-w-3xl h-auto rounded-md"
                      controls
                      src={'/api/static/' + OriginalPaths.video}
                      key={OriginalPaths.video} // Add key to force re-render on path change
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

              <AiSuggestions
                tasks={processingStatus.tasks}
                form={form}
                movieId={id}
                isApplied={aiSuggestionsApplied}
                setApplied={setAiSuggestionsApplied}
                isApplying={isApplyingAISuggestions}
                startTransition={startApplyAISuggestionsTransition}
                setGenreItems={setGenreItems}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-4 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(PATHS.ADMIN.MOVIES)}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="movie-details-form"
        >
          {isNewMovie ? 'Create Movie' : 'Update Movie'}
        </Button>
      </div>
    </div>
  );
}

interface AiSuggestionsProps {
  tasks: MediaProcessingStatus['tasks'];
  form: UseFormReturn<z.infer<typeof formSchema>>;
  movieId: string;
  isApplied: boolean;
  setApplied: (applied: boolean) => void;
  isApplying: boolean;
  startTransition: React.TransitionStartFunction;
  setGenreItems: React.Dispatch<
    React.SetStateAction<{ id: string; label: string }[]>
  >;
}

function AiSuggestions({
  tasks,
  form,
  movieId,
  isApplied,
  setApplied,
  isApplying,
  startTransition,
  setGenreItems,
}: AiSuggestionsProps) {
  const aiTask = tasks.find(
    (t) => t.engine === 'AIEngine' && t.status === 'completed',
  );

  // Type guard to ensure output is AIEngineOutput
  const aiOutput =
    aiTask?.output && 'data' in aiTask.output ?
      (aiTask.output as AIEngineOutput)
      : null;

  if (!aiOutput?.data) return null; // Return early if no AI task or data

  const { title, description, genres } = aiOutput.data;

  const handleApplySuggestions = () => {
    if (!title || !description || !genres || isApplied || isApplying) return;

    startTransition(async () => {
      try {
        form.setValue('title', title);
        form.setValue('description', description);
        setGenreItems((prevGenres) => {
          const currentGenreLabels = new Set(prevGenres.map((g) => g.label));
          const newGenresToAdd = genres.filter(
            (g: string) => !currentGenreLabels.has(g),
          );
          if (newGenresToAdd.length > 0) {
            return [
              ...prevGenres,
              ...newGenresToAdd.map((label: string) => ({
                id: label.toLowerCase().replace(/\s+/g, '-'),
                label,
              })),
            ];
          }
          return prevGenres;
        });
        form.setValue('genres', genres);
        form.setValue('isAIGenerated', true);

        const result = await applyAISuggestions(movieId, {
          title,
          description,
          genres,
        });

        if (result.success) {
          setApplied(true);
          console.log('AI Suggestions applied successfully.');
          // Add user feedback (e.g., toast)
        } else {
          console.error('Failed to apply AI suggestions:', result.message);
          form.setValue('isAIGenerated', false); // Revert on failure
          // Add user feedback (e.g., toast)
        }
      } catch (error) {
        console.error('Error applying AI suggestions:', error);
        form.setValue('isAIGenerated', false); // Revert on error
        // Add user feedback (e.g., toast)
      }
    });
  };

  return (
    <div className="mt-6 p-4   rounded-md bg-muted/30 relative">
      <ShineBorder shineColor={['#D130B9', '#DC3639']} />
      {isApplied && (
        <Badge
          variant="secondary"
          className="absolute top-2 right-2 bg-green-100 text-green-800 border-green-300"
        >
          Applied
        </Badge>
      )}
      <h5 className="font-semibold mb-3 flex items-center gap-2">
        <SparkelIcon />
        AI Generated Suggestions
      </h5>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          AI has analyzed your video and generated the following suggestions:
        </p>
        <div className="grid gap-4">
          {title && (
            <div className="p-3 bg-background rounded-md border">
              <h6 className="text-sm font-medium mb-1">Title Suggestion</h6>
              <p className="text-sm text-muted-foreground">{title}</p>
            </div>
          )}
          {description && (
            <div className="p-3 bg-background rounded-md border">
              <h6 className="text-sm font-medium mb-1">
                Description Suggestion
              </h6>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          )}
          {genres && genres.length > 0 && (
            <div className="p-3 bg-background rounded-md border">
              <h6 className="text-sm font-medium mb-1">Genre Suggestions</h6>
              <p className="text-sm text-muted-foreground">
                {genres.join(', ')}
              </p>
            </div>
          )}
        </div>

        {(title || description || (genres && genres.length > 0)) && (
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              onClick={handleApplySuggestions}
              disabled={isApplied || isApplying}
              className={`
                relative overflow-hidden group transition-opacity duration-300
                ${isApplied ? 'opacity-50 cursor-not-allowed' : ''}
                ${isApplying ? 'opacity-75 cursor-wait' : ''}
              `}
              variant="outline"
            >
              <span
                className="absolute inset-[-2px] rounded-md z-[-1] bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    'linear-gradient(to right, #D130B9, #DC3639, #EA171B)',
                  opacity: isApplied || isApplying ? 0 : undefined,
                }}
                aria-hidden="true"
              />
              <span
                className="absolute inset-0 bg-background rounded-[5px] z-[-1] group-hover:opacity-95 transition-opacity duration-300"
                aria-hidden="true"
              ></span>

              <span className="relative z-10 flex items-center gap-2">
                {isApplying ?
                  'Applying...'
                  : isApplied ?
                    <>
                      {' '}
                      <Check className="h-4 w-4" /> Applied{' '}
                    </>
                    : <>
                      {' '}
                      <Sparkles className="h-4 w-4" /> Apply Suggestions{' '}
                    </>
                }
              </span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
