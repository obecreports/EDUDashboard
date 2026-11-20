'use client';

import { uploadOverseerPhoto } from '@/lib/media/storage-upload';
import { saveSelfAvatarAction } from '@/app/actions/auth';

/** Upload photo for `userId` then persist avatar_url. */
export async function uploadAndSaveSelfAvatar(
  userId: string,
  file: File
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const uploaded = await uploadOverseerPhoto(userId, file);
  if (!uploaded.ok) return uploaded;

  const fd = new FormData();
  fd.set('avatar_url', uploaded.url);
  const saved = await saveSelfAvatarAction(fd);
  if (!saved.ok) return { ok: false, error: saved.error };
  return { ok: true, url: uploaded.url };
}
