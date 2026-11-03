import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { storage } from './firebase'

/** Downscale an image in the browser (stands in for flutter_image_compress). */
export async function compressImage(file: File, maxSize = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return new Promise((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', quality))
}

/** Upload to Firebase Storage at `path` and return the download URL. */
export async function uploadFile(path: string, data: Blob, onProgress?: (pct: number) => void): Promise<string> {
  const task = uploadBytesResumable(ref(storage, path), data, { contentType: data.type || undefined })
  await new Promise<void>((resolve, reject) =>
    task.on('state_changed', (s) => onProgress?.((s.bytesTransferred / s.totalBytes) * 100), reject, () => resolve()),
  )
  return getDownloadURL(task.snapshot.ref)
}

export async function deleteFileByUrl(url: string) {
  try {
    await deleteObject(ref(storage, url))
  } catch {
    /* already gone / not a storage URL */
  }
}
