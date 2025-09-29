'use server';

import { join } from 'path';

import { getStorage } from '@/lib/storage';

export async function upload(
  formData: FormData,
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const file: File | null = formData.get('file') as unknown as File;

  if (!file) {
    return { success: false, error: 'No file provided.' };
  }

  const storage = getStorage();

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Define the destination path within the storage
  const destinationPath = join('uploads', file.name).replace(/\\/g, '/');

  try {
    // Use the storage adapter to write the file directly
    const finalPath = await storage.writeFile(destinationPath, buffer);
    console.log(`File written to ${finalPath}`);

    return { success: true, filePath: finalPath };
  } catch (error) {
    console.error('Error writing file with storage adapter:', error);
    return { success: false, error: 'Error writing file.' };
  }
}
