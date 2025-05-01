'use client';

import type React from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type MouseEvent,
} from 'react';
// Added useCallback
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, Loader2, Sparkles, Wand2 } from 'lucide-react'; // Added Loader2
import { useForm, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/admin/components/ui/button'; // Added buttonVariants
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
import { Label } from '@/admin/components/ui/label'; // Add Label import
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
import { cn } from '@/admin/lib/utils';
import {
  applyAISuggestions,
  generateAIImagesWithPrompt, // Import the new action
  getMediaProcessingJob, // Removed duplicate
  processVideo,
  saveMovieData,
  suggestImagePrompt,
  uploadAction,
  type MediaProcessingStatus,
} from '@/app/(admin)/admin/movies/_action';
import { ShineBorder } from '@/components/magicui/shine-border';
import { PATHS } from '@/constants/paths';
import { AIEngineOutput } from '@/lib/media/engine-outputs';
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

  // --- State for Prompt-Based Image Generation ---
  const [posterPrompt, setPosterPrompt] = useState('');
  const [backdropPrompt, setBackdropPrompt] = useState('');
  const [isGeneratingPoster, startPosterGenerationTransition] = useTransition();
  const [isGeneratingBackdrop, startBackdropGenerationTransition] =
    useTransition();
  const [promptGeneratedPosterPath, setPromptGeneratedPosterPath] = useState<
    string | null
  >(null);
  const [promptGeneratedBackdropPath, setPromptGeneratedBackdropPath] =
    useState<string | null>(null);

  // For error message display
  const [posterGenerationError, setPosterGenerationError] = useState<
    string | null
  >(null);
  const [backdropGenerationError, setBackdropGenerationError] = useState<
    string | null
  >(null);

  // Add state variables for prompt suggestion loading states
  const [isPosterPromptLoading, setIsPosterPromptLoading] = useState(false);
  const [isBackdropPromptLoading, setIsBackdropPromptLoading] = useState(false);

  // Derive AI image paths from initial processing status
  const aiEngineTaskOutput = useMemo(() => {
    const task = processingStatus.tasks.find((t) => {
      // Check engine type and completion status first
      if (t.engine !== 'AIEngine' || t.status !== 'completed' || !t.output) {
        return false;
      }
      // Type guard: Check if 'data' exists and is an object (basic check for AIEngineOutput structure)
      return (
        typeof t.output === 'object' && t.output !== null && 'data' in t.output
      );
    });
    // If task found and passes guard, assert the type
    return task?.output as AIEngineOutput | undefined;
  }, [processingStatus.tasks]);

  const initialAiGeneratedPosterPath = useMemo(
    () => aiEngineTaskOutput?.data?.posterImagePath || null,
    [aiEngineTaskOutput],
  );
  const initialAiGeneratedBackdropPath = useMemo(
    () => aiEngineTaskOutput?.data?.backdropImagePath || null,
    [aiEngineTaskOutput],
  );

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
      media: {
        video: undefined,
        poster: undefined,
        backdrop: undefined,
      },
    },
  });

  const errors = form.formState.errors;
  console.log(errors);
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
    console.log('Form submitted');

    // Check if at least one field has content (title, description, year, genres, or any media file)
    const hasContent = !!(
      values.title ||
      values.description ||
      values.year ||
      (values.genres && values.genres.length > 0) ||
      values.media?.video?.originalPath ||
      values.media?.poster?.originalPath ||
      values.media?.backdrop?.originalPath
    );

    if (!hasContent) {
      toast.error('Cannot save movie', {
        description:
          'Please fill in at least one field or upload media before saving.',
      });
      return;
    }

    // If trying to publish, verify all required fields are present
    if (values.status === 'Published') {
      const missingFields = [];

      if (!values.title) missingFields.push('Title');
      if (!values.description) missingFields.push('Description');
      if (!values.year) missingFields.push('Year');
      if (!values.genres || values.genres.length === 0)
        missingFields.push('Genres');
      if (!values.media?.video?.originalPath) missingFields.push('Video');
      if (
        !values.media?.poster?.originalPath &&
        !values.media?.poster?.aiGeneratedPath
      )
        missingFields.push('Poster');
      if (
        !values.media?.backdrop?.originalPath &&
        !values.media?.backdrop?.aiGeneratedPath
      )
        missingFields.push('Backdrop');

      if (missingFields.length > 0) {
        toast.error('Cannot publish movie', {
          description: `Please fill in all required fields: ${missingFields.join(', ')}`,
        });
        return;
      }
    }

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
      toast.error('Failed to save movie', { description: res.message });
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
            // Clear AI path in form only for poster/backdrop
            if (type === 'poster' || type === 'backdrop') {
              form.setValue(`media.${type}.aiGeneratedPath`, undefined);
            }
            showToast('Upload Successful', `${type} uploaded successfully.`);
          } else {
            console.error(`Upload failed for ${type}:`, res);
            // Check if res has a message property before accessing it
            const message =
              typeof res === 'object' && res !== null && 'message' in res ?
                res.message
              : 'Unknown error';
            showToast(
              'Upload Failed',
              `${type} upload failed: ${message}`,
              true,
            );
          }
        } catch (error: any) {
          console.error(`Error uploading ${type}:`, error);
          showToast(
            'Upload Error',
            `Error uploading ${type}: ${error.message}`,
            true,
          );
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
          showToast('Processing Started', 'Video processing initiated.');
          setIsPolling(true);
        } else {
          console.error('Failed to initiate processing:', res.message);
          showToast(
            'Processing Error',
            `Failed to start: ${res.message}`,
            true,
          );
        }
      })
      .catch((err) => {
        console.error('Error calling processVideo action:', err);
        showToast(
          'Action Error',
          `Error starting process: ${err.message}`,
          true,
        );
      });
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(window.location.origin + text);
    setIsCopied(true);
    showToast('URL Copied', 'Playback URL copied to clipboard.');
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

  // Add a toast for notifications
  const showToast = (title: string, description: string, error = false) => {
    if (error) {
      toast.error(title, { description });
    } else {
      toast.success(title, { description });
    }
  };

  // --- Handlers to use AI Images (Initial or Prompt-Generated) ---
  const handleUseAIImage = (
    type: 'poster' | 'backdrop',
    source: 'initial' | 'prompt',
  ) => {
    let path: string | null = null;
    if (source === 'initial') {
      path =
        type === 'poster' ?
          initialAiGeneratedPosterPath
        : initialAiGeneratedBackdropPath;
    } else {
      path =
        type === 'poster' ?
          promptGeneratedPosterPath
        : promptGeneratedBackdropPath;
    }

    if (path) {
      form.setValue(`media.${type}.originalPath`, path); // Set AI path as the main path
      form.setValue(`media.${type}.id`, `ai-generated-${source}`); // Use a marker for ID indicating source
      form.setValue(`media.${type}.aiGeneratedPath`, path); // Ensure aiGeneratedPath is also set in form
      showToast(
        `AI ${type} Selected`,
        `Using the ${source === 'initial' ? 'initially' : 'prompt-'}generated ${type}.`,
      );
      // Clear the other AI source path if one is selected
      if (source === 'initial') {
        setPromptGeneratedPosterPath(
          type === 'poster' ? null : promptGeneratedPosterPath,
        );
        setPromptGeneratedBackdropPath(
          type === 'backdrop' ? null : promptGeneratedBackdropPath,
        );
      }
    } else {
      showToast(
        `AI ${type} Not Found`,
        `No ${source}-generated AI ${type} available.`,
        true,
      );
    }
  };

  // --- Handlers for Prompt-Based Image Generation ---
  const handleSuggestPrompt = useCallback(
    async (type: 'poster' | 'backdrop') => {
      const { title, description, genres } = form.getValues();
      const promptField = type === 'poster' ? posterPrompt : backdropPrompt;
      const isEnhance = !!promptField.trim();

      // If attempting to enhance with no base prompt, show error
      if (isEnhance && !promptField.trim()) {
        showToast(
          'Cannot Enhance',
          'Please enter a prompt to enhance first.',
          true,
        );
        return;
      }

      // If no data to build on, show error
      if (
        !isEnhance &&
        !title &&
        !description &&
        (!genres || genres.length === 0)
      ) {
        showToast(
          'Cannot Suggest',
          'Please fill in title, description, or genres first.',
          true,
        );
        return;
      }

      // Set loading state based on type
      if (type === 'poster') {
        setIsPosterPromptLoading(true);
      } else {
        setIsBackdropPromptLoading(true);
      }

      try {
        // For direct suggestion (no existing prompt)
        if (!isEnhance) {
          const result = await suggestImagePrompt(type, {
            title: title || '',
            description: description || '',
            genres: genres || [],
            initialPrompt: '',
          });

          if (result.success && result.prompt) {
            if (type === 'poster') {
              setPosterPrompt(result.prompt);
            } else {
              setBackdropPrompt(result.prompt);
            }
            showToast('Prompt Generated', `Generated prompt for ${type}.`);
          } else {
            const errorMsg = result.error || 'Failed to generate prompt';
            showToast('Generation Failed', errorMsg, true);
          }
        }
        // For enhancement (existing prompt)
        else {
          const result = await suggestImagePrompt(type, {
            title: title || '',
            description: description || '',
            genres: genres || [],
            initialPrompt: promptField,
          });

          if (result.success && result.prompt) {
            if (type === 'poster') {
              setPosterPrompt(result.prompt);
            } else {
              setBackdropPrompt(result.prompt);
            }
            showToast('Prompt Enhanced', `Enhanced prompt for ${type}.`);
          } else {
            const errorMsg = result.error || 'Failed to enhance prompt';
            showToast('Enhancement Failed', errorMsg, true);
          }
        }
      } catch (error) {
        console.error(`Error generating prompt for ${type}:`, error);
        showToast(
          'Error',
          `Failed to generate prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
          true,
        );
      } finally {
        // Clear loading state
        if (type === 'poster') {
          setIsPosterPromptLoading(false);
        } else {
          setIsBackdropPromptLoading(false);
        }
      }
    },
    [form, posterPrompt, backdropPrompt, showToast],
  );

  const handleGenerateImage = (type: 'poster' | 'backdrop') => {
    const prompt = type === 'poster' ? posterPrompt : backdropPrompt;
    if (!prompt) {
      showToast(
        'Prompt Missing',
        `Please enter a prompt for the ${type}.`,
        true,
      );
      return;
    }

    // Clear previous error message
    if (type === 'poster') {
      setPosterGenerationError(null);
    } else {
      setBackdropGenerationError(null);
    }

    const transition =
      type === 'poster' ?
        startPosterGenerationTransition
      : startBackdropGenerationTransition;

    transition(async () => {
      showToast(
        'Generating Image...',
        `Generating ${type} using AI. This may take a moment.`,
      );
      try {
        // Fix: Pass only prompt and type parameters
        const result = await generateAIImagesWithPrompt(prompt, type);
        if (result.success) {
          if (result.path) {
            // If successful and has a path, set the generated path based on type
            if (type === 'poster') {
              setPromptGeneratedPosterPath(result.path);
              showToast(
                'Poster Generated',
                'AI poster generated successfully.',
              );
            } else {
              setPromptGeneratedBackdropPath(result.path);
              showToast(
                'Backdrop Generated',
                'AI backdrop generated successfully.',
              );
            }
          } else {
            // Success but no path (rare case)
            const errorMsg = `AI process completed, but the requested ${type} image was not generated. This may be due to content filters.`;
            if (type === 'poster') {
              setPosterGenerationError(errorMsg);
            } else {
              setBackdropGenerationError(errorMsg);
            }
            showToast('Generation Issue', errorMsg, true);
          }
        } else {
          // Display error for unsuccessful generation
          const errorMsg =
            result.error ?
              String(result.error)
            : `Failed to generate ${type} due to an unknown error`;
          console.error(`Failed to generate ${type}:`, errorMsg);
          if (type === 'poster') {
            setPosterGenerationError(errorMsg);
          } else {
            setBackdropGenerationError(errorMsg);
          }
          showToast('Generation Failed', errorMsg, true);
        }
      } catch (error: any) {
        console.error(`Error generating ${type}:`, error);
        const errorMsg = error.message || `Error generating ${type}`;
        if (type === 'poster') {
          setPosterGenerationError(errorMsg);
        } else {
          setBackdropGenerationError(errorMsg);
        }
        showToast('Generation Error', errorMsg, true);
      }
    });
  };

  // Determine if suggest button should be enabled
  const canSuggestPrompt = useMemo(() => {
    const { title, description, genres } = form.getValues();
    // Either existing movie data OR existing prompt content justifies enabling the button
    return (
      !!title ||
      !!description ||
      (!!genres && genres.length > 0) ||
      !!posterPrompt.trim() ||
      !!backdropPrompt.trim()
    );
  }, [
    form.watch('title'),
    form.watch('description'),
    form.watch('genres'),
    posterPrompt,
    backdropPrompt,
  ]);

  return (
    <form
      id="movie-details-form"
      onSubmit={form.handleSubmit(onSubmit)}
    >
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
                                          const currentValue =
                                            field.value || [];
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
                              <SelectItem value="Published">
                                Published
                              </SelectItem>
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
                  </div>
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
                    <div className="flex flex-col space-y-4">
                      <video
                        className=" self-center w-full max-w-3xl h-auto rounded-md"
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
                >
                  {/* --- Prompt-Based Poster Generation --- */}
                  <div className="mt-6 p-4 border rounded-md space-y-4 bg-gradient-to-br from-purple-50/5 via-pink-50/5 to-orange-50/5 relative overflow-hidden">
                    <ShineBorder shineColor={['#D130B9', '#DC3639']} />{' '}
                    {/* --- Initial AI Generated Poster --- */}
                    {initialAiGeneratedPosterPath && (
                      <div className="space-y-3  relative">
                        {/* Corrected prop name */}
                        <h4 className="font-medium flex items-center gap-2">
                          <SparkelIcon />
                          <span className="bg-clip-text text-transparent font-semibold bg-gradient-to-r from-pink-500 to-orange-500">
                            Initially Generated Poster
                          </span>
                        </h4>
                        <div className="flex flex-col gap-2 items-start">
                          <Image
                            src={'/api/static/' + initialAiGeneratedPosterPath}
                            alt="Initially Generated Poster"
                            width={100}
                            height={150}
                            className="rounded-md object-cover border"
                            unoptimized
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleUseAIImage('poster', 'initial')
                            }
                            disabled={
                              form.getValues('media.poster.originalPath') ===
                              initialAiGeneratedPosterPath
                            }
                          >
                            {(
                              form.getValues('media.poster.originalPath') ===
                              initialAiGeneratedPosterPath
                            ) ?
                              'Using Initial AI Poster'
                            : 'Use Initial AI Poster'}
                          </Button>
                        </div>
                      </div>
                    )}
                    {initialAiGeneratedPosterPath && (
                      <span className="block mx-auto w-fit text-sm text-muted-foreground self-center">
                        OR
                      </span>
                    )}
                    {/* Corrected prop name */}
                    <h4 className="font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500 w-fit">
                      <SparkelIcon /> Generate Poster with AI Prompt
                    </h4>
                    {/* Replaced FormItem/Label/Control with div/Label */}
                    <div className="space-y-2 relative">
                      <Label htmlFor="poster-prompt">Poster Prompt</Label>
                      <div className="relative">
                        {isPosterPromptLoading && (
                          <div className="absolute inset-0 bg-gradient-to-r from-pink-100/20 via-background/5 to-purple-100/20 animate-pulse rounded-md z-0"></div>
                        )}
                        <Textarea
                          id="poster-prompt"
                          placeholder="e.g., A lone astronaut gazing at a swirling nebula, cinematic, detailed..."
                          value={posterPrompt}
                          onChange={(e) => setPosterPrompt(e.target.value)}
                          className={cn(
                            'min-h-[80px] bg-background/80 backdrop-blur-sm relative z-10',
                            isPosterPromptLoading && 'opacity-70',
                          )}
                          disabled={isGeneratingPoster || isPosterPromptLoading}
                        />
                      </div>
                      {isPosterPromptLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {posterPrompt.trim() ?
                            'Enhancing prompt...'
                          : 'Generating prompt...'}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestPrompt('poster')}
                        disabled={
                          !canSuggestPrompt ||
                          isGeneratingPoster ||
                          isPosterPromptLoading
                        }
                        className="relative overflow-hidden group transition-opacity duration-300"
                      >
                        <span
                          className="absolute inset-[-1px] rounded-md z-[-1] bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 opacity-0 group-hover:opacity-80 transition-opacity duration-300 mb-0"
                          aria-hidden="true"
                        />
                        <span
                          className="absolute inset-0 bg-background rounded-[5px] z-[-1] group-hover:opacity-90 transition-opacity duration-300"
                          aria-hidden="true"
                        ></span>
                        <span className="relative z-10 flex items-center gap-1">
                          {isPosterPromptLoading ?
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              {posterPrompt.trim() ?
                                'Enhancing...'
                              : 'Suggesting...'}
                            </>
                          : <>
                              <Sparkles className="w-3 h-3" />{' '}
                              {posterPrompt.trim() ? 'Enhance' : 'Suggest'}
                            </>
                          }
                        </span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleGenerateImage('poster')}
                        disabled={!posterPrompt || isGeneratingPoster}
                        className={cn(
                          'relative overflow-hidden group transition-opacity duration-300',
                          'bg-gradient-to-r  from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white',
                        )}
                      >
                        {isGeneratingPoster && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {isGeneratingPoster ?
                          'Generating...'
                        : 'Generate Poster'}
                      </Button>
                    </div>
                    {/* Display Prompt-Generated Poster */}
                    {promptGeneratedPosterPath && (
                      <div className="mt-4 pt-4 border-t border-dashed">
                        <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <Wand2 className="w-4 h-4 text-pink-500" />{' '}
                          Prompt-Generated Poster
                        </h5>
                        <div className="flex flex-col sm:flex-row gap-4 items-center relative">
                          {isGeneratingPoster && (
                            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center rounded-md z-10">
                              <Loader2 className="h-8 w-8 animate-spin text-white" />
                            </div>
                          )}
                          <Image
                            src={'/api/static/' + promptGeneratedPosterPath}
                            alt="Prompt Generated Poster"
                            width={100}
                            height={150}
                            className={cn(
                              'rounded-md object-cover border transition-opacity duration-300',
                              isGeneratingPoster ? 'opacity-50' : 'opacity-100',
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleUseAIImage('poster', 'prompt')}
                            disabled={
                              form.getValues('media.poster.originalPath') ===
                                promptGeneratedPosterPath || isGeneratingPoster
                            }
                          >
                            {(
                              form.getValues('media.poster.originalPath') ===
                              promptGeneratedPosterPath
                            ) ?
                              'Using This Poster'
                            : 'Use This Poster'}
                          </Button>
                        </div>
                      </div>
                    )}
                    {/* Add shimmer/loading effect when generating */}
                    {isGeneratingPoster && !promptGeneratedPosterPath && (
                      <div className="mt-4 pt-4 border-t border-dashed flex items-center justify-center h-[180px] bg-muted/30 rounded-md relative overflow-hidden">
                        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-purple-200/30 via-pink-200/30 to-orange-200/30"></div>
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                    {/* Display error message if generation failed */}
                    {!isGeneratingPoster && posterGenerationError && (
                      <div className="mt-4 pt-4 border-t border-dashed">
                        <div className="p-2 px-3 bg-secondary text-red-400 shadow-md">
                          <h5 className="font-medium text-sm mb-1 flex items-center gap-2">
                            Generation Error
                          </h5>
                          <p className="text-sm">{posterGenerationError}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </MediaUploadSection>

                <MediaUploadSection
                  mediaType="backdrop"
                  title="Backdrop Image"
                  description="Upload a backdrop image (recommended size: 1920x1080px)."
                  accept="image/*"
                  originalPath={OriginalPaths.backdrop}
                  isUploading={backdropUploadPending}
                  onFileChange={(e) => handelMediaUpload(e, 'backdrop')}
                  file={mediaFiles.backdrop}
                >
                  {/* --- Prompt-Based Backdrop Generation --- */}
                  <div className="mt-6 p-4 border rounded-md space-y-4 bg-gradient-to-br from-purple-50/5 via-pink-50/5 to-orange-50/5 relative overflow-hidden">
                    <ShineBorder shineColor={['#D130B9', '#DC3639']} />{' '}
                    {/* --- Initial AI Generated Backdrop --- */}
                    {initialAiGeneratedBackdropPath && (
                      <div className="space-y-3 relative">
                        {/* Corrected prop name */}
                        <h4 className="font-medium flex items-center gap-2">
                          <SparkelIcon />
                          <span className="bg-clip-text text-transparent font-semibold bg-gradient-to-r from-pink-500 to-orange-500">
                            Initially Generated Backdrop
                          </span>
                        </h4>
                        <div className="flex flex-col gap-4  items-start">
                          <Image
                            src={
                              '/api/static/' + initialAiGeneratedBackdropPath
                            }
                            alt="Initially Generated Backdrop"
                            width={200}
                            height={112}
                            className="rounded-md object-cover border"
                            unoptimized
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleUseAIImage('backdrop', 'initial')
                            }
                            disabled={
                              form.getValues('media.backdrop.originalPath') ===
                              initialAiGeneratedBackdropPath
                            }
                          >
                            {(
                              form.getValues('media.backdrop.originalPath') ===
                              initialAiGeneratedBackdropPath
                            ) ?
                              'Using Initial AI Backdrop'
                            : 'Use Initial AI Backdrop'}
                          </Button>
                        </div>
                      </div>
                    )}
                    {initialAiGeneratedBackdropPath && (
                      <span className="block mx-auto w-fit text-sm text-muted-foreground self-center">
                        OR
                      </span>
                    )}
                    {/* Corrected prop name */}
                    <h4 className="font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500 w-fit">
                      <SparkelIcon /> Generate Backdrop with AI Prompt
                    </h4>
                    {/* Replaced FormItem/Label/Control with div/Label */}
                    <div className="space-y-2 relative">
                      <Label htmlFor="backdrop-prompt">Backdrop Prompt</Label>
                      <div className="relative">
                        {isBackdropPromptLoading && (
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 via-background/5 to-purple-100/20 animate-pulse rounded-md z-0"></div>
                        )}
                        <Textarea
                          id="backdrop-prompt"
                          placeholder="e.g., A vast futuristic cityscape at sunset, wide angle, cinematic..."
                          value={backdropPrompt}
                          onChange={(e) => setBackdropPrompt(e.target.value)}
                          className={cn(
                            'min-h-[80px] bg-background/80 backdrop-blur-sm relative z-10',
                            isBackdropPromptLoading && 'opacity-70',
                          )}
                          disabled={
                            isGeneratingBackdrop || isBackdropPromptLoading
                          }
                        />
                      </div>
                      {isBackdropPromptLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {backdropPrompt.trim() ?
                            'Enhancing prompt...'
                          : 'Generating prompt...'}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestPrompt('backdrop')}
                        disabled={
                          !canSuggestPrompt ||
                          isGeneratingBackdrop ||
                          isBackdropPromptLoading
                        }
                        className="relative overflow-hidden group transition-opacity duration-300"
                      >
                        <span
                          className="absolute inset-[-1px] rounded-md z-[-1] bg-gradient-to-r from-pink-500 to-orange-500 opacity-0 group-hover:opacity-80 transition-opacity duration-300"
                          aria-hidden="true"
                        />
                        <span
                          className="absolute inset-0 bg-background rounded-[5px] z-[-1] group-hover:opacity-90 transition-opacity duration-300"
                          aria-hidden="true"
                        ></span>
                        <span className="relative z-10 flex items-center gap-1">
                          {isBackdropPromptLoading ?
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              {backdropPrompt.trim() ?
                                'Enhancing...'
                              : 'Suggesting...'}
                            </>
                          : <>
                              <Sparkles className="w-3 h-3" />{' '}
                              {backdropPrompt.trim() ? 'Enhance' : 'Suggest'}
                            </>
                          }
                        </span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleGenerateImage('backdrop')}
                        disabled={!backdropPrompt || isGeneratingBackdrop}
                        className={cn(
                          'relative overflow-hidden group transition-opacity duration-300',
                          'bg-gradient-to-r  from-pink-600 to-orange-600  hover:from-pink-700 hover:to-orange-700 text-white',
                        )}
                      >
                        {isGeneratingBackdrop && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {isGeneratingBackdrop ?
                          'Generating...'
                        : 'Generate Backdrop'}
                      </Button>
                    </div>
                    {/* Display Prompt-Generated Backdrop */}
                    {promptGeneratedBackdropPath && (
                      <div className="mt-4 pt-4 border-t border-dashed">
                        <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <Wand2 className="w-4 h-4 text-pink-500" />{' '}
                          Prompt-Generated Backdrop
                        </h5>
                        <div className="flex flex-col sm:flex-row gap-4 items-center relative">
                          {isGeneratingBackdrop && (
                            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center rounded-md z-10">
                              <Loader2 className="h-8 w-8 animate-spin text-white" />
                            </div>
                          )}
                          <Image
                            src={'/api/static/' + promptGeneratedBackdropPath}
                            alt="Prompt Generated Backdrop"
                            width={200}
                            height={112}
                            className={cn(
                              'rounded-md object-cover border transition-opacity duration-300',
                              isGeneratingBackdrop ? 'opacity-50' : (
                                'opacity-100'
                              ),
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleUseAIImage('backdrop', 'prompt')
                            }
                            disabled={
                              form.getValues('media.backdrop.originalPath') ===
                                promptGeneratedBackdropPath ||
                              isGeneratingBackdrop
                            }
                          >
                            {(
                              form.getValues('media.backdrop.originalPath') ===
                              promptGeneratedBackdropPath
                            ) ?
                              'Using This Backdrop'
                            : 'Use This Backdrop'}
                          </Button>
                        </div>
                      </div>
                    )}
                    {/* Add shimmer/loading effect when generating */}
                    {isGeneratingBackdrop && !promptGeneratedBackdropPath && (
                      <div className="mt-4 pt-4 border-t border-dashed flex items-center justify-center h-[140px] bg-muted/30 rounded-md relative overflow-hidden">
                        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-purple-200/30 via-pink-200/30 to-orange-200/30"></div>
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                    {/* Display error message if generation failed */}
                    {!isGeneratingBackdrop && backdropGenerationError && (
                      <div className="mt-4 pt-4 border-t border-dashed">
                        <div className="p-2 px-3 bg-secondary text-red-400 shadow-md">
                          <h5 className="font-medium text-sm mb-1 flex items-center gap-2">
                            Generation Error
                          </h5>
                          <p className="text-sm">{backdropGenerationError}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </MediaUploadSection>

                <AiSuggestions
                  isNewMovie={isNewMovie}
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
          <Button type="submit">
            {isNewMovie ? 'Create Movie' : 'Update Movie'}
          </Button>
        </div>
      </div>
    </form>
  );
}

interface AiSuggestionsProps {
  isNewMovie: boolean;
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
  isNewMovie,
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

        if (isNewMovie) {
          setApplied(true);
          return;
        }

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
