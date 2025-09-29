import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { join } from 'path';
import { Readable } from 'stream';

import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const pathName = req.nextUrl.pathname.replace('/api/static/', '');

  if (!process.env.LOCAL_STORAGE_PATH) {
    throw new Error(
      'LOCAL_STORAGE_PATH is not defined in environment variables',
    );
  }

  let dir = process.env.LOCAL_STORAGE_PATH;

  if (pathName.includes('playback')) {
    dir = 'converted';
  }

  const filePath = join(dir, pathName.replace('tmp/', '').replace('tmp', ''));

  try {
    const stats = await stat(filePath);
    const rangeHeader = req.headers.get('range');

    if (!rangeHeader) {
      const fileStream = createReadStream(filePath);
      const headers = new Headers({
        'Content-Length': stats.size.toString(),
        'Accept-Ranges': 'bytes',
      });

      const webStream = Readable.toWeb(fileStream);
      return new Response(webStream as any, { headers });
    }

    const range = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(range[0], 10);
    const end = range[1] ? parseInt(range[1], 10) : stats.size - 1;
    const chunkSize = end - start + 1;

    const headers = new Headers({
      'Content-Range': `bytes ${start}-${end}/${stats.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize.toString(),
    });

    const fileStream = createReadStream(filePath, { start, end });
    const webStream = Readable.toWeb(fileStream);

    return new Response(webStream as any, {
      status: 206,
      headers,
    });
  } catch (error) {
    console.error('Error streaming file:', error);
    return new Response('File not found', { status: 404 });
  }
}
