'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { MovieSchemaType } from '@/lib/validation/schemas';

import { AIImageGenerationPanel } from '@/admin/components/AIImageGenerationPanel';
import { AiSuggestions } from '@/admin/components/AiSuggestions';
import { MediaProcessingSection } from '@/admin/components/MediaProcessingSection';
import MediaUploadSection from '@/admin/components/MediaUploadSection';
import { MovieDetailsForm } from '@/admin/components/MovieDetailsForm';
import { Button } from '@/admin/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/admin/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/admin/components/ui/tabs';
import {
  useAIGeneratedContent,
  useAIImageGeneration,
  useAIPromptGeneration,
} from '@/admin/hooks/useAIFeatures';
import { useMediaUpload } from '@/admin/hooks/useMediaUpload';
import { useMovieJobProcessing } from '@/admin/hooks/useMovieJob';
import { saveMovieData } from '@/app/(admin)/admin/movies/_action';
import { PATHS } from '@/constants/paths';
import { MovieSchema } from '@/lib/validation/schemas';
import { zodResolver } from '@hookform/resolvers/zod';

const defaultGenreItems = [
  { id: 'action', label: 'Action' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'drama', label: 'Drama' },
  { id: 'horror', label: 'Horror' },
  { id: 'sci-fi', label: 'Sci-Fi' },
];

export default function RefactoredEditMoviePage({
  isNewMovie,
  defaultValues,
  id,
}: {
  defaultValues?: MovieSchemaType;
  isNewMovie: boolean;
  id: string;
}) {
  const router = useRouter();
  const [isSaving, startSavingTransition] = useTransition();

  const form = useForm<MovieSchemaType>({
    resolver: zodResolver(MovieSchema),
    defaultValues:
      defaultValues ||
      ({
        /* initial default values */
      } as MovieSchemaType),
  });

  const { processingStatus, initiateJob, handleRetryJob, isRetrying } =
    useMovieJobProcessing(form.watch('media.video.id'));

  const [genreItems, setGenreItems] = useState(defaultGenreItems);

  const { aiOutput, isApplying, isApplied, handleApplySuggestions } =
    useAIGeneratedContent(
      processingStatus?.tasks || [],
      form,
      id,
      isNewMovie,
      defaultValues?.isAIGenerated || false,
      setGenreItems,
    );

  const {
    posterPrompt,
    setPosterPrompt,
    backdropPrompt,
    setBackdropPrompt,
    isGeneratingPoster,
    isGeneratingBackdrop,
    posterError,
    backdropError,
    generatedPosterPath,
    generatedBackdropPath,
    handleGenerateImage,
    handleUseAIImage,
  } = useAIImageGeneration(form);

  const { isSuggestingPoster, isSuggestingBackdrop, handleSuggestPrompt } =
    useAIPromptGeneration(
      form,
      posterPrompt,
      setPosterPrompt,
      backdropPrompt,
      setBackdropPrompt,
    );
  const { mediaFiles, handleMediaUpload, isUploading } = useMediaUpload(form);

  const canSuggestPrompt = useMemo(() => {
    const { title, description, genres } = form.getValues();
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

  const onSubmit = (values: MovieSchemaType) => {
    startSavingTransition(async () => {
      try {
        const finalValues = {
          ...values,
          genres: Array.from(new Set(values.genres || [])),
        };

        const res = await saveMovieData(
          finalValues,
          isNewMovie ? undefined : id,
        );

        if (res.success) {
          toast.success(
            isNewMovie ?
              'Movie created successfully!'
            : 'Movie updated successfully!',
          );
          router.push(PATHS.ADMIN.MOVIES);
          router.refresh(); // To reflect changes in the movie list
        } else {
          toast.error('Failed to save movie', {
            description:
              res.message || 'An unexpected error occurred. Please try again.',
          });
        }
      } catch (error) {
        console.error('An unexpected error occurred during submission:', error);
        toast.error('An unexpected error occurred', {
          description: 'Please check the console for more details.',
        });
      }
    });
  };

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
              </CardHeader>
              <CardContent>
                <MovieDetailsForm
                  form={form}
                  genreItems={genreItems}
                  setGenreItems={setGenreItems}
                />
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
                  originalPath={form.watch('media.video.originalPath')}
                  isUploading={isUploading.video}
                  onFileChange={(e) => handleMediaUpload(e, 'video')}
                  file={mediaFiles.video}
                >
                  <MediaProcessingSection
                    originalPath={form.watch('media.video.originalPath')}
                    mediaId={form.watch('media.video.id')}
                    processingStatus={processingStatus}
                    onInitiateJob={initiateJob}
                    onRetryJob={handleRetryJob}
                    isRetrying={isRetrying}
                    movieId={id}
                  />
                </MediaUploadSection>

                <MediaUploadSection
                  mediaType="poster"
                  title="Poster Image"
                  description="Upload a poster image (recommended size: 400x600px)."
                  accept="image/*"
                  originalPath={form.watch('media.poster.originalPath')}
                  isUploading={isUploading.poster}
                  onFileChange={(e) => handleMediaUpload(e, 'poster')}
                  file={mediaFiles.poster}
                >
                  <AIImageGenerationPanel
                    type="poster"
                    prompt={posterPrompt}
                    setPrompt={setPosterPrompt}
                    isGenerating={isGeneratingPoster}
                    generationError={posterError}
                    generatedPath={generatedPosterPath}
                    onGenerate={() => handleGenerateImage('poster')}
                    onUseImage={(path) => handleUseAIImage('poster', path)}
                    isSuggesting={isSuggestingPoster}
                    onSuggest={() => handleSuggestPrompt('poster')}
                    canSuggest={canSuggestPrompt}
                    initialAIPath={aiOutput?.data?.posterImagePath || null}
                    onUseInitialAIImage={() =>
                      handleUseAIImage(
                        'poster',
                        aiOutput?.data?.posterImagePath || '',
                      )
                    }
                    currentPath={form.watch('media.poster.originalPath')}
                  />
                </MediaUploadSection>

                <MediaUploadSection
                  mediaType="backdrop"
                  title="Backdrop Image"
                  description="Upload a backdrop image (recommended size: 1920x1080px)."
                  accept="image/*"
                  originalPath={form.watch('media.backdrop.originalPath')}
                  isUploading={isUploading.backdrop}
                  onFileChange={(e) => handleMediaUpload(e, 'backdrop')}
                  file={mediaFiles.backdrop}
                >
                  <AIImageGenerationPanel
                    type="backdrop"
                    prompt={backdropPrompt}
                    setPrompt={setBackdropPrompt}
                    isGenerating={isGeneratingBackdrop}
                    generationError={backdropError}
                    generatedPath={generatedBackdropPath}
                    onGenerate={() => handleGenerateImage('backdrop')}
                    onUseImage={(path) => handleUseAIImage('backdrop', path)}
                    isSuggesting={isSuggestingBackdrop}
                    onSuggest={() => handleSuggestPrompt('backdrop')}
                    canSuggest={canSuggestPrompt}
                    initialAIPath={aiOutput?.data?.backdropImagePath || null}
                    onUseInitialAIImage={() =>
                      handleUseAIImage(
                        'backdrop',
                        aiOutput?.data?.backdropImagePath || '',
                      )
                    }
                    currentPath={form.watch('media.backdrop.originalPath')}
                  />
                </MediaUploadSection>

                {aiOutput && (
                  <AiSuggestions
                    aiOutput={aiOutput}
                    isApplied={isApplied}
                    isApplying={isApplying}
                    onApply={handleApplySuggestions}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(PATHS.ADMIN.MOVIES)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
          >
            {isSaving ?
              'Saving...'
            : isNewMovie ?
              'Create Movie'
            : 'Update Movie'}
          </Button>
        </div>
      </div>
    </form>
  );
}
