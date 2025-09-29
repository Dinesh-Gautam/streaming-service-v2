import { NextRequest, NextResponse } from 'next/server';

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  const data = await request.formData();
  const file: File | null = data.get('file') as unknown as File;

  if (!file) {
    return NextResponse.json(
      { success: false, error: 'No file provided.' },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const storageDir = join(process.cwd(), '..', '..', 'storage', 'uploads');
  const filePath = join(storageDir, file.name);

  try {
    await mkdir(storageDir, { recursive: true });
    await writeFile(filePath, buffer);
    console.log(`File saved to ${filePath}`);

    const relativePath = join('storage', 'uploads', file.name).replace(
      /\\/g,
      '/',
    );

    return NextResponse.json({ success: true, filePath: relativePath });
  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json(
      { success: false, error: 'Error saving file.' },
      { status: 500 },
    );
  }
}
