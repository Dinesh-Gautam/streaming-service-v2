// apps/frontend/src/app/(admin)/admin/movies/[id]/hooks/useMediaUpload.ts
import { useState, useTransition } from 'react';

import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { upload } from '@/actions/upload';
import { MovieSchema } from '@/lib/validation/schemas';

type MediaTypes = 'video' | 'poster' | 'backdrop';

export function useMediaUpload(
  form: ReturnType<typeof useForm<z.infer<typeof MovieSchema>>>,
) {
  const [mediaFiles, setMediaFiles] = useState<Record<MediaTypes, File | null>>(
    {
      video: null,
      poster: null,
      backdrop: null,
    },
  );
  const [videoUploading, startVideoTransition] = useTransition();
  const [posterUploading, startPosterTransition] = useTransition();
  const [backdropUploading, startBackdropTransition] = useTransition();

  const transitions = {
    video: startVideoTransition,
    poster: startPosterTransition,
    backdrop: startBackdropTransition,
  };

  const isUploading = {
    video: videoUploading,
    poster: posterUploading,
    backdrop: backdropUploading,
  };

  const handleMediaUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: MediaTypes,
  ) => {
    transitions[type](async () => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setMediaFiles((prev) => ({ ...prev, [type]: file }));

        const formData = new FormData();
        formData.append('file', file);

        try {
          const uploadResult = await upload(formData);

          if (uploadResult.success && uploadResult.filePath) {
            toast.success(`${type} uploaded successfully.`);
            const newId = Math.random().toString(36).substring(2, 15);
            form.setValue(`media.${type}.originalPath`, uploadResult.filePath);
            form.setValue(`media.${type}.id`, newId);
            if (type === 'poster' || type === 'backdrop') {
              form.setValue(`media.${type}.aiGeneratedPath`, undefined);
            }
          } else {
            toast.error(
              `${type} upload failed: ${uploadResult.error || 'Unknown error'}`,
            );
          }
        } catch (error: any) {
          toast.error(`Error uploading ${type}: ${error.message}`);
        }
      }
    });
  };

  return {
    mediaFiles,
    handleMediaUpload,
    isUploading,
  };
}
