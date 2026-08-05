import { api } from '../lib/api'

export interface Profile {
  username: string
  display_name?: string
  avatar_url?: string
}

export async function updateDisplayName(displayName: string): Promise<Profile> {
  const { data } = await api.put<Profile>('/me', { display_name: displayName })
  return data
}

export async function uploadAvatar(file: File): Promise<Profile> {
  const form = new FormData()
  form.append('avatar', file)
  const { data } = await api.post<Profile>('/me/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
