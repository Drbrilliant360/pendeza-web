// Port of app/helpers/connectivity_helper.dart: tells the user when the connection drops/returns.
import { Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cx } from './ui'

export default function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [showBack, setShowBack] = useState(false)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    const up = () => {
      setOnline(true)
      setShowBack(true)
      t = setTimeout(() => setShowBack(false), 2500)
    }
    const down = () => {
      setOnline(false)
      setShowBack(false)
    }
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
      clearTimeout(t)
    }
  }, [])
  if (online && !showBack) return null
  return (
    <div
      role="status"
      aria-live="assertive"
      className={cx(
        'fixed inset-x-0 top-0 z-[80] flex items-center justify-center gap-2 px-4 py-2 text-center text-[13px] font-semibold text-white shadow-md1',
        online ? 'bg-success' : 'bg-ink dark:bg-danger',
      )}
    >
      {online ? <Wifi size={16} /> : <WifiOff size={16} />}
      {online ? 'Back online' : "You're offline. Changes can't be saved until your connection returns."}
    </div>
  )
}
