import { api } from '../lib/api'
import type { Household } from '../types'

export async function fetchHousehold(): Promise<Household> {
  const { data } = await api.get<{ household: Household }>('/household')
  return data.household
}

export async function updateHousehold(
  name: string,
  defaultBudget: number | null,
  slogan: string,
): Promise<Household> {
  const { data } = await api.put<{ household: Household }>('/household', {
    name,
    default_budget: defaultBudget,
    slogan,
  })
  return data.household
}
