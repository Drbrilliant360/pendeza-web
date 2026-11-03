// Data access for the auth/onboarding group (bundled JSON assets + profile picture upload).
import { compressImage, uploadFile } from '@/lib/storage'

export interface BusinessType {
  id: string
  name: string
  icon: string
  description?: string
  targetGender?: string
  suggestedCategories?: string[]
}

export interface Region {
  name: string
  districts?: { name: string }[]
}

/** assets/data/business_types.json */
export async function loadBusinessTypes(): Promise<BusinessType[]> {
  const res = await fetch('/data/business_types.json')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as BusinessType[]
}

/** assets/location/tanzaniaRegionsAndDistricts.json, sorted by region name (OwnerBusinessDetailsScreen._loadRegions). */
export async function loadRegions(): Promise<Region[]> {
  const res = await fetch('/location/tanzaniaRegionsAndDistricts.json')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as Region[]
  return data.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

/**
 * ClientProfileSetupScreen._uploadProfilePicture – Storage path `profile_pictures/{uid}.jpg`.
 * The app picks with imageQuality 70 / maxWidth 800, mirrored by compressImage.
 */
export async function uploadProfilePicture(uid: string, file: File, onProgress?: (pct: number) => void): Promise<string> {
  const blob = await compressImage(file, 800, 0.7)
  return uploadFile(`profile_pictures/${uid}.jpg`, blob, onProgress)
}
