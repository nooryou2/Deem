import { app,auth } from '@/config/firebase';
import type { Attachment } from '@/types';
import { deleteObject,getDownloadURL,getStorage,ref,uploadBytes } from 'firebase/storage';

const storage = getStorage(app);
const MAX_BYTES = 5 * 1024 * 1024;
export async function uploadAttachment(
  file: { uri: string; name: string; mimeType?: string; size?: number },
  providerId?: string,
): Promise<Attachment> {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('UNAUTHENTICATED');
  if (file.size && file.size > MAX_BYTES) throw new Error('INVALID_FILE');
  const response = await fetch(file.uri);
  if (!response.ok) throw new Error('FILE_UNREADABLE');
  const blob = await response.blob();
  const contentType = file.mimeType || blob.type;
  if (
    blob.size > MAX_BYTES ||
    !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(contentType)
  )
    throw new Error('INVALID_FILE');
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const path = `attachments/${userId}/${providerId || 'private'}/${id}`;
  await uploadBytes(ref(storage, path), blob, { contentType });
  return { id, path, name: file.name, contentType, size: blob.size };
}
export function attachmentURL(attachment: Attachment) {
  return getDownloadURL(ref(storage, attachment.path));
}
export function removeAttachment(attachment: Attachment) {
  return deleteObject(ref(storage, attachment.path));
}
