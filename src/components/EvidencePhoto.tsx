import { useEffect, useState } from 'react'
import { getEvidenceUrl } from '../services/storageService'

interface EvidencePhotoProps {
  path: string
  alt: string
  className?: string
}

export function EvidencePhoto({ path, alt, className }: EvidencePhotoProps) {
  const [url, setUrl] = useState<string>()
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    getEvidenceUrl(path)
      .then(result => { if (active) { setUrl(result); setError(false) } })
      .catch(() => { if (active) { setUrl(undefined); setError(true) } })
    return () => { active = false }
  }, [path])

  if (error) return <p className="text-xs text-gray-500">Evidence photo is unavailable to this account.</p>
  if (!url) return <p className="text-xs text-gray-500">Loading evidence photo…</p>
  return <img src={url} alt={alt} className={className} />
}
