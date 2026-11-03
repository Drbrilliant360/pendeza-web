// Avatar picker → ProfileRepositoryImpl.updateProfileImage → AuthBloc ReloadUser.
import { useRef, useState } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { useFeedback } from '@/components/feedback'
import { ProgressBar } from '@/components/ui'
import { updateProfileImage } from '../api'

/** Same picker for the profile hero and the edit-profile avatar. */
export function useAvatarUpload(uid: string) {
  const { reloadUser } = useAuth()
  const { toast, toastSuccess, toastError } = useFeedback()
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const busy = useRef(false)
  const pick = () => {
    if (busy.current) return
    input.current?.click()
  }

  const upload = async (file: File) => {
    if (busy.current) return
    if (!file.type.startsWith('image/')) {
      toast('Please choose an image file (JPG or PNG).', 'error')
      return
    }
    busy.current = true
    setProgress(0)
    setUploading(true)
    try {
      await updateProfileImage(uid, file, setProgress)
      await reloadUser()
      toastSuccess('Profile picture updated!')
    } catch (e) {
      toastError(e, 'Failed to upload image', () => void upload(file))
    } finally {
      busy.current = false
      setUploading(false)
    }
  }

  const element = (
    <input
      ref={input}
      type="file"
      accept="image/*"
      hidden
      onChange={(e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (file) void upload(file)
      }}
    />
  )
  /** Determinate upload progress (render under the avatar while uploading). */
  const progressBar = uploading ? <ProgressBar value={progress} label="Uploading photo…" /> : null
  return { pick, uploading, progress, element, progressBar }
}
