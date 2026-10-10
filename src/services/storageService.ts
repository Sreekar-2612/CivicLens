import { supabase } from './supabaseClient'

export const BUCKET_NAME = 'evidence-photos'
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const allowedTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function uploadEvidenceFile(
  file: File,
  folder: 'grievances' | 'projects' | 'inspections' = 'grievances'
): Promise<string> {
  const extension = allowedTypes[file.type]
  if (!extension) throw new Error('Evidence must be a JPEG, PNG, or WebP image.')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Evidence image must be under 10 MB.')

  if (supabase) {
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError || !auth.user) throw new Error('Sign in before uploading evidence.')
    const path = `${folder}/${auth.user.id}/${crypto.randomUUID()}.${extension}`
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw new Error(`Evidence upload failed: ${error.message}`)
    // Persist an object path. A signed URL expires and must be created for each view.
    return data.path
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the evidence image.'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

export async function getEvidenceUrl(pathOrUrl: string): Promise<string> {
  if (/^(https?:|data:|blob:)/i.test(pathOrUrl)) return pathOrUrl
  if (!supabase) throw new Error('Evidence storage is unavailable.')
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(pathOrUrl, 60 * 5)
  if (error || !data?.signedUrl) throw new Error('Evidence photo is not available to this account.')
  return data.signedUrl
}
