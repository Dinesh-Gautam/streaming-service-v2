import React from 'react';
import Image from 'next/image';
import { Input } from '@/admin/components/ui/input';
import { Progress } from '@/admin/components/ui/progress';

interface MediaUploadSectionProps {
    mediaType: 'video' | 'poster' | 'backdrop';
    title: string;
    description: string;
    accept: string;
    originalPath: string | undefined | null;
    isUploading: boolean;
    uploadProgress?: number;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    file?: File | null;
    children?: React.ReactNode;
}

const MediaUploadSection: React.FC<MediaUploadSectionProps> = ({
    mediaType,
    title,
    description,
    accept,
    originalPath,
    isUploading,
    uploadProgress,
    onFileChange,
    file,
    children,
}) => {
    const getPreviewSize = () => {
        switch (mediaType) {
            case 'poster':
                return { width: 150, height: 225 };
            case 'backdrop':
                return { width: 480, height: 270 };
            default:
                return { width: 0, height: 0 }; // Video handled separately via children
        }
    };

    const { width, height } = getPreviewSize();
    const staticSrc = originalPath ? `/api/static/${originalPath}` : '/placeholder.svg';

    return (
        <div className="space-y-4 p-4 border rounded-md bg-card">
            <div className="flex flex-col space-y-1">
                <h3 className="text-lg font-medium">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            <div className="grid gap-4">
                {/* File Input */}
                <div>
                    <Input
                        type="file"
                        accept={accept}
                        onChange={onFileChange}
                        className="cursor-pointer"
                        disabled={isUploading}
                    />
                    {file && !isUploading && (
                        <div className="text-xs text-muted-foreground mt-1">
                            {file.name} (
                            {Math.round((file.size / 1024 / 1024) * 10) / 10} MB)
                        </div>
                    )}
                </div>

                {/* Uploading State */}
                {isUploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="animate-pulse">Uploading...</span>
                        {uploadProgress !== undefined && (
                            <Progress value={uploadProgress} className="w-1/2 h-2" />
                        )}
                    </div>
                )}

                {/* Preview for Images */}
                {!isUploading && originalPath && mediaType !== 'video' && (
                    <div className="flex">
                        <div
                            className="relative border rounded-md overflow-hidden"
                            style={{ width: `${width}px`, height: `${height}px` }}
                        >
                            <Image
                                src={staticSrc}
                                alt={`${title} preview`}
                                className="object-cover"
                                fill
                                unoptimized
                            />
                        </div>
                    </div>
                )}

                {/* Children (for Video Preview, Process Button, Progress Bar etc.) */}
                {!isUploading && children}
            </div>
        </div>
    );
};

export default MediaUploadSection; 