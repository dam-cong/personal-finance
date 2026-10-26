import { api } from '../lib/api'

export interface Profile {
  username: string
  display_name?: string
}

export async function updateDisplayName(displayName: string): Promise<Profile> {
  const { data } = await api.put<Profile>('/me', { display_name: displayName })
  return data
}
