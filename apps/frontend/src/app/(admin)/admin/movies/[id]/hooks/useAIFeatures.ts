import { useCallback, useMemo, useState, useTransition } from 'react';

import { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { MediaTask } from '@monorepo/core';

import {
  applyAISuggestions,
  generateAIImagesWithPrompt,
  suggestImagePrompt,
} from '@/app/(admin)/admin/movies/_action';
import { AIEngineOutput } from '@/lib/media/engine-outputs';
import { MovieSchema } from '@/lib/validation/schemas';

export function useAIGeneratedContent(
  tasks: MediaTask[],
  form: UseFormReturn<z.infer<typeof MovieSchema>>,
  movieId: string,
  isNewMovie: boolean,
  initialIsAIGenerated: boolean,
  setGenreItems: React.Dispatch<
    React.SetStateAction<{ id: string; label: string }[]>
  >,
) {
  const [isApplying, startApplyTransition] = useTransition();
  const [isApplied, setApplied] = useState(initialIsAIGenerated);

  const aiOutput = useMemo(() => {
    const aiTask = tasks.find(
      (t) => t.worker === 'ai' && t.status === 'completed',
    );
    return aiTask?.output && 'data' in aiTask.output ?
        (aiTask.output as AIEngineOutput)
      : null;
  }, [tasks]);

  const handleApplySuggestions = useCallback(() => {
    if (!aiOutput?.data || isApplied || isApplying) return;

    const { title, description, genres } = aiOutput.data;
    if (!title || !description || !genres) return;

    startApplyTransition(async () => {
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
          toast.success('AI suggestions applied to the form.');
          return;
        }

        const result = await applyAISuggestions(movieId, {
          title,
          description,
          genres,
        });

        if (result.success) {
          setApplied(true);
          toast.success('AI suggestions applied and saved.');
        } else {
          form.setValue('isAIGenerated', false); // Revert on failure
          toast.error(
            `Failed to apply AI suggestions: ${result.message || 'Unknown error'}`,
          );
        }
      } catch (error) {
        form.setValue('isAIGenerated', false); // Revert on error
        toast.error(
          `Error applying AI suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    });
  }, [
    aiOutput,
    isApplied,
    isApplying,
    startApplyTransition,
    form,
    setGenreItems,
    isNewMovie,
    movieId,
  ]);

  return {
    aiOutput,
    isApplying,
    isApplied,
    handleApplySuggestions,
  };
}

export function useAIImageGeneration(
  form: UseFormReturn<z.infer<typeof MovieSchema>>,
) {
  const [posterPrompt, setPosterPrompt] = useState('');
  const [backdropPrompt, setBackdropPrompt] = useState('');
  const [isGeneratingPoster, startPosterGeneration] = useTransition();
  const [isGeneratingBackdrop, startBackdropGeneration] = useTransition();
  const [posterError, setPosterError] = useState<string | null>(null);
  const [backdropError, setBackdropError] = useState<string | null>(null);
  const [generatedPosterPath, setGeneratedPosterPath] = useState<string | null>(
    null,
  );
  const [generatedBackdropPath, setGeneratedBackdropPath] = useState<
    string | null
  >(null);

  const handleGenerateImage = useCallback(
    (type: 'poster' | 'backdrop') => {
      const prompt = type === 'poster' ? posterPrompt : backdropPrompt;
      if (!prompt) {
        toast.error(`Please enter a prompt for the ${type}.`);
        return;
      }

      if (type === 'poster') setPosterError(null);
      else setBackdropError(null);

      const transition =
        type === 'poster' ? startPosterGeneration : startBackdropGeneration;

      transition(async () => {
        toast.info(`Generating ${type}...`);
        const result = await generateAIImagesWithPrompt(prompt, type);

        if (result.success && result.path) {
          if (type === 'poster') {
            setGeneratedPosterPath(result.path);
            toast.success('AI poster generated successfully.');
          } else {
            setGeneratedBackdropPath(result.path);
            toast.success('AI backdrop generated successfully.');
          }
        } else {
          const errorMsg =
            result.error ||
            `Failed to generate ${type} due to an unknown error`;
          if (type === 'poster') setPosterError(errorMsg);
          else setBackdropError(errorMsg);
          toast.error(errorMsg);
        }
      });
    },
    [
      posterPrompt,
      backdropPrompt,
      startPosterGeneration,
      startBackdropGeneration,
    ],
  );

  const handleUseAIImage = useCallback(
    (type: 'poster' | 'backdrop', path: string) => {
      form.setValue(`media.${type}.originalPath`, path);
      form.setValue(`media.${type}.aiGeneratedPath`, path);
      form.setValue(`media.${type}.id`, `ai-generated-${Date.now()}`);
      toast.success(`Using the generated ${type}.`);
    },
    [form],
  );

  return {
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
  };
}

export function useAIPromptGeneration(
  form: UseFormReturn<z.infer<typeof MovieSchema>>,
  posterPrompt: string,
  setPosterPrompt: (p: string) => void,
  backdropPrompt: string,
  setBackdropPrompt: (p: string) => void,
) {
  const [isSuggestingPoster, startSuggestPoster] = useTransition();
  const [isSuggestingBackdrop, startSuggestBackdrop] = useTransition();

  const handleSuggestPrompt = useCallback(
    async (type: 'poster' | 'backdrop') => {
      const { title, description, genres } = form.getValues();
      const initialPrompt = type === 'poster' ? posterPrompt : backdropPrompt;

      if (
        !initialPrompt &&
        !title &&
        !description &&
        (!genres || genres.length === 0)
      ) {
        toast.error('Please fill in title, description, or genres first.');
        return;
      }

      const transition =
        type === 'poster' ? startSuggestPoster : startSuggestBackdrop;

      transition(async () => {
        toast.info(`Generating ${type} prompt suggestion...`);
        const result = await suggestImagePrompt(type, {
          title: title || '',
          description: description || '',
          genres: genres || [],
          initialPrompt,
        });

        if (result.success && result.prompt) {
          if (type === 'poster') {
            setPosterPrompt(result.prompt);
          } else {
            setBackdropPrompt(result.prompt);
          }
          toast.success(`Generated prompt for ${type}.`);
        } else {
          toast.error(result.error || 'Failed to generate prompt');
        }
      });
    },
    [
      form,
      posterPrompt,
      backdropPrompt,
      startSuggestPoster,
      startSuggestBackdrop,
      setPosterPrompt,
      setBackdropPrompt,
    ],
  );

  return {
    isSuggestingPoster,
    isSuggestingBackdrop,
    handleSuggestPrompt,
  };
}
