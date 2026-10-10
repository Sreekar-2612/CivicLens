import { useEffect, useState } from 'react'
import { getEvidenceUrl } from '../services/storageService'

interface EvidencePhotoProps {
  path: string
  alt: string
  className?: string
}

export function EvidencePhoto({ path, alt, className }: EvidencePhotoProps) {
  const [url, setUrl] = useState<string | undefined>(() =>
    /^(https?:|data:|blob:)/i.test(path) ? path : undefined
  )
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    if (/^(https?:|data:|blob:)/i.test(path)) {
      setUrl(path)
      setError(false)
      return
    }
    setUrl(undefined)
    setError(false)
    getEvidenceUrl(path)
      .then(result => { if (active) { setUrl(result); setError(false) } })
      .catch(() => { if (active) { setUrl(undefined); setError(true) } })
    return () => { active = false }
  }, [path])

  if (error) {
    return (
      <div className="w-full h-full min-h-[140px] flex flex-col items-center justify-center bg-[#021217]/10 p-4 text-center">
        <span className="text-xs text-[#536267]">Evidence photo unavailable</span>
      </div>
    )
  }

  if (!url) {
    return (
      <div className="w-full h-full min-h-[140px] flex items-center justify-center bg-[#021217]/5 animate-pulse">
        <span className="text-xs text-[#536267]/60">Loading evidence…</span>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => { setUrl(undefined); setError(true) }}
    />
  )
}
