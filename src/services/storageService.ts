import { supabase } from './supabaseClient'

export const BUCKET_NAME = 'evidence-photos'

export async function uploadEvidenceFile(
  file: File,
  folder: 'grievances' | 'projects' | 'inspections' = 'grievances'
): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'jpg'
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`

  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, { cacheControl: '3600', upsert: true })

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(data.path)
        return publicUrlData.publicUrl
      }
    } catch (err) {
      console.warn('Supabase storage upload error, fallback to Base64:', err)
    }
  }

  // Fallback to Base64 Data URL for offline / local preview
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
}
