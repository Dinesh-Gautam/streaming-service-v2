import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { join } from 'path';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const pathName = req.nextUrl.pathname.replace('/api/static/', '');

  let dir = 'tmp';
  if (pathName.includes('playback')) {
    dir = 'converted';
  }
  const filePath = join(dir, pathName);

  try {
    const stats = await stat(filePath);
    const rangeHeader = req.headers.get('range');

    if (!rangeHeader) {
      // No range requested, send entire file
      const fileStream = createReadStream(filePath);
      const headers = new Headers({
        'Content-Length': stats.size.toString(),
        'Accept-Ranges': 'bytes',
      });

      const stream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (error) => controller.error(error));
        },
      });

      return new Response(stream, { headers });
    }

    // Handle range request
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
    const stream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (error) => controller.error(error));
      },
    });

    return new Response(stream, {
      status: 206,
      headers,
    });
  } catch (error) {
    console.error('Error streaming file:', error);
    return new Response('File not found', { status: 404 });
  }
}
