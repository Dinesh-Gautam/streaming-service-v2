import { redirect } from 'next/navigation';

export default async function thumbnailServe({
  params,
}: {
  params: Promise<{ id: string; filename: string }>;
}) {
  const { filename, id: jobId } = await params;
  return redirect(`/api/static/${jobId}/thumbnails/${filename}`);
}
