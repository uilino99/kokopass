import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable
} from 'firebase/storage';
import { storage } from '../firebase.js';

const DEFAULT_MAX_DIM = 1600;
const DEFAULT_QUALITY = 0.82;

export async function compressImage(
  file,
  { maxDim = DEFAULT_MAX_DIM, quality = DEFAULT_QUALITY } = {}
) {
  if (!file) throw new Error('No file provided.');
  if (!file.type?.startsWith('image/')) {
    throw new Error('Only image files are supported.');
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    // Fallback: upload the original file unchanged.
    return file;
  }

  const ratio = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * ratio));
  const h = Math.max(1, Math.round(bitmap.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed.'))),
      'image/jpeg',
      quality
    );
  });
}

export function uploadImage(path, blob, onProgress) {
  return new Promise((resolve, reject) => {
    const r = ref(storage, path);
    const task = uploadBytesResumable(r, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: 'public, max-age=86400'
    });
    task.on(
      'state_changed',
      (snap) => {
        if (snap.totalBytes > 0 && onProgress) {
          onProgress((snap.bytesTransferred / snap.totalBytes) * 100);
        }
      },
      (err) => reject(err),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

export const deleteByUrl = async (url) => {
  if (!url) return;
  try {
    const r = ref(storage, url);
    await deleteObject(r);
  } catch {
    /* swallow — best effort */
  }
};
