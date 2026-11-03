// Port of SalonProfileBloc (salon_profile_bloc.dart): load/refresh, info/contact/hours/amenities
// updates, primary/gallery image upload + delete, and the video upload pipeline.
import type { UploadTask } from 'firebase/storage'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { useFeedback } from '@/components/feedback'
import { getSalonForOwner } from '@/lib/firestore'
import type { SalonModel } from '@/lib/models'
import * as api from '../api'
import { compressSalonPhoto, MAX_VIDEOS_PER_SALON } from '../helpers'
import type { SalonVideoModel } from '../models'

export type VideoStage = 'compressing' | 'uploading_video' | 'uploading_thumbnail' | 'processing' | 'saving'
export const videoStageText = (stage: VideoStage) =>
  ({
    compressing: 'Compressing video...',
    uploading_video: 'Uploading video...',
    uploading_thumbnail: 'Creating thumbnail...',
    processing: 'Processing video...',
    saving: 'Saving...',
  })[stage] ?? 'Processing...'

export interface VideoUploadState {
  progress: number
  stage: VideoStage
}

class Cancelled extends Error {}

/** Image upload progress: file `index` (1-based) of `total`, `progress` 0–1 for the current file. */
export interface ImageUploadState {
  progress: number
  type: 'primary' | 'gallery'
  index: number
  total: number
}

export function useSalonProfile() {
  const { user } = useAuth()
  const { toast, toastSuccess, toastError } = useFeedback()
  const salonIdRef = useRef<string | null>(null)
  const [salon, setSalon] = useState<SalonModel | null>(null)
  const [videos, setVideos] = useState<SalonVideoModel[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  /** Raw load error – rendered through ErrorState/friendlyError, never shown as-is. */
  const [error, setError] = useState<unknown>(null)
  const [imageUpload, setImageUpload] = useState<ImageUploadState | null>(null)
  const [videoUpload, setVideoUpload] = useState<VideoUploadState | null>(null)
  const cancelRef = useRef(false)
  const taskRef = useRef<UploadTask | null>(null)
  const imageCancelRef = useRef(false)
  const imageTaskRef = useRef<UploadTask | null>(null)

  const getSalonId = useCallback(async () => {
    if (salonIdRef.current) return salonIdRef.current
    if (!user) throw new Error('User not authenticated')
    const s = await getSalonForOwner(user.uid)
    if (!s) throw new Error('No salon found for this owner')
    salonIdRef.current = s.id
    return s.id
  }, [user])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const id = await getSalonId()
      const [s, v] = await Promise.all([api.getSalonProfile(id), api.getSalonVideos(id)])
      setSalon(s)
      setVideos(v)
    } catch (e) {
      console.error('Failed to load salon profile', e)
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [getSalonId])

  useEffect(() => void load(), [load])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const id = await getSalonId()
      const [s, v] = await Promise.all([api.getSalonProfile(id), api.getSalonVideos(id)])
      setSalon(s)
      setVideos(v)
    } catch (e) {
      if (!salon) setError(e)
      else toastError(e, 'Could not refresh your salon profile', () => void refresh())
    } finally {
      setRefreshing(false)
    }
  }, [getSalonId, salon, toastError])

  /**
   * Run a salon mutation and re-read the salon doc (bloc pattern). Throws on failure so the
   * calling dialog can keep its pending state and show the success / error toast (useAction).
   */
  const mutate = useCallback(
    async (fn: (salonId: string) => Promise<void>) => {
      const id = await getSalonId()
      await fn(id)
      setSalon(await api.getSalonProfile(id))
    },
    [getSalonId],
  )

  const updateBasicInfo = (p: { salonName: string; description: string | null; address: string }) =>
    mutate((salonId) => api.updateBasicInfo({ salonId, ...p }))

  const updateContactInfo = (p: { phoneNumber: string; whatsappNumber: string | null; instagram: string | null; facebook: string | null }) =>
    mutate((salonId) => api.updateContactInfo({ salonId, ...p }))

  const updateBusinessHours = (openingTime: string, closingTime: string) =>
    mutate((salonId) => api.updateBusinessHours({ salonId, openingTime, closingTime }))

  const updateAmenities = (amenities: string[]) => mutate((salonId) => api.updateAmenities({ salonId, amenities }))

  /**
   * Upload one primary photo or one-or-more gallery photos, one after another
   * ("Uploading 2 of 5" + % in the progress strip). A failed file is reported and the rest continue.
   */
  const uploadImages = async (files: File[], isPrimary: boolean) => {
    if (!salon || files.length === 0 || imageUpload) return
    const list = isPrimary ? files.slice(0, 1) : files
    const type = isPrimary ? 'primary' : 'gallery'
    const current = salon
    imageCancelRef.current = false
    let added = 0
    try {
      const id = await getSalonId()
      for (let i = 0; i < list.length; i++) {
        if (imageCancelRef.current) break
        const state = { type, index: i + 1, total: list.length } as const
        setImageUpload({ ...state, progress: 0 })
        try {
          const data = await compressSalonPhoto(list[i]).catch(() => list[i])
          const url = await api.uploadSalonImage({
            salonId: id,
            data,
            isPrimary,
            onProgress: (p) => setImageUpload({ ...state, progress: p }),
            onTask: (t) => (imageTaskRef.current = t),
          })
          imageTaskRef.current = null
          if (isPrimary) {
            if (current.primaryImage) await api.deleteImage(current.primaryImage)
            await api.updatePrimaryImage(id, url)
          } else {
            await api.addGalleryImage(id, url)
          }
          added++
        } catch (e) {
          imageTaskRef.current = null
          if (imageCancelRef.current) break
          toastError(e, list.length > 1 ? `Could not upload photo ${i + 1} of ${list.length}` : 'Failed to upload image')
        }
      }
      if (added > 0) {
        setSalon(await api.getSalonProfile(id))
        if (isPrimary) toastSuccess('Primary photo updated!')
        else toastSuccess(added === 1 ? 'Photo added to gallery!' : `${added} photos added to gallery!`)
      }
      if (imageCancelRef.current) toast(added > 0 ? `Upload cancelled – ${added} of ${list.length} photos saved` : 'Upload cancelled', 'warning')
    } catch (e) {
      toastError(e, 'Failed to upload image')
    } finally {
      imageCancelRef.current = false
      imageTaskRef.current = null
      setImageUpload(null)
    }
  }
  const uploadImage = (file: File, isPrimary: boolean) => uploadImages([file], isPrimary)

  const cancelImageUpload = () => {
    imageCancelRef.current = true
    imageTaskRef.current?.cancel()
  }

  const deletePrimaryImage = async () => {
    if (!salon?.primaryImage) return
    const url = salon.primaryImage
    await mutate(async (id) => {
      await api.deleteImage(url)
      await api.deletePrimaryImage(id)
    })
  }

  const deleteGalleryImage = async (index: number) => {
    const gallery = salon?.imageGallery ?? []
    if (index < 0 || index >= gallery.length) return
    const url = gallery[index]
    await mutate(async (id) => {
      await api.deleteImage(url)
      await api.deleteGalleryImage(id, index)
    })
  }

  // ── videos ────────────────────────────────────────────────────────────────
  const uploadVideo = async (p: { file: File; thumbnail: Blob; durationSeconds: number; caption: string | null }) => {
    if (!salon || !user) return
    cancelRef.current = false
    if (videos.length >= MAX_VIDEOS_PER_SALON) {
      toast(`Maximum ${MAX_VIDEOS_PER_SALON} videos allowed. Please delete a video first.`, 'warning')
      return
    }
    let videoUrl: string | null = null
    try {
      const salonId = await getSalonId()
      // No client-side re-encode on web (video_compress is native-only): upload the original file.
      setVideoUpload({ progress: 0, stage: 'uploading_video' })
      const { task, done } = api.uploadSalonVideo({
        salonId,
        file: p.file,
        onProgress: (f) => {
          if (!cancelRef.current) setVideoUpload({ progress: f * 0.8, stage: 'uploading_video' })
        },
      })
      taskRef.current = task
      try {
        videoUrl = await done
      } finally {
        taskRef.current = null
      }
      if (cancelRef.current) {
        await api.deleteVideoFile(videoUrl)
        throw new Cancelled('Upload cancelled during upload')
      }

      setVideoUpload({ progress: 0.9, stage: 'uploading_thumbnail' })
      const thumbnailUrl = await api.uploadVideoThumbnail({ salonId, videoId: String(Date.now()), thumbnail: p.thumbnail })

      try {
        await api.callVideoProcessingFunction({ salonId, videoUrl, duration: p.durationSeconds, caption: p.caption })
      } catch {
        /* logged and ignored, as in the app */
      }

      setVideoUpload({ progress: 0.95, stage: 'saving' })
      const video = await api.createVideoRecord({
        salonId,
        ownerId: user.uid,
        videoUrl,
        thumbnailUrl,
        durationSeconds: p.durationSeconds,
        caption: p.caption,
      })
      setVideos((v) => [video, ...v])
      toastSuccess('Video uploaded!')
    } catch (e) {
      if (e instanceof Cancelled || cancelRef.current) {
        // The cancel confirmation already showed "Upload cancelled".
      } else {
        toastError(e, 'Failed to upload video')
      }
    } finally {
      cancelRef.current = false
      setVideoUpload(null)
    }
  }

  const cancelVideoUpload = () => {
    cancelRef.current = true
    taskRef.current?.cancel()
  }

  /** Throws on failure (callers show pending + toasts via useAction). */
  const updateVideoCaption = async (videoId: string, caption: string) => {
    await api.updateVideoCaption(videoId, caption)
    setVideos((vs) => vs.map((v) => (v.id === videoId ? { ...v, caption } : v)))
  }

  /** Throws on failure (callers show pending + toasts via useAction). */
  const deleteVideo = async (videoId: string) => {
    await api.deleteVideo(videoId)
    setVideos((vs) => vs.filter((v) => v.id !== videoId))
  }

  return {
    salon,
    videos,
    loading,
    refreshing,
    error,
    imageUpload,
    videoUpload,
    load,
    refresh,
    updateBasicInfo,
    updateContactInfo,
    updateBusinessHours,
    updateAmenities,
    uploadImage,
    uploadImages,
    cancelImageUpload,
    deletePrimaryImage,
    deleteGalleryImage,
    uploadVideo,
    cancelVideoUpload,
    updateVideoCaption,
    deleteVideo,
  }
}

export type SalonProfileController = ReturnType<typeof useSalonProfile>
