import { describe, expect, it, vi } from 'vitest'

vi.mock('../supabaseClient', () => ({
  isSupabaseConfigured: () => false,
  supabase: null,
}))

import { dataRepository } from '../dataRepository'

describe('database-only repository without a connection', () => {
  it('reports an unavailable database instead of showing sample records', async () => {
    expect(dataRepository.getDataSourceMode().mode).toBe('unavailable')
    await expect(dataRepository.getProjects()).rejects.toThrow('Supabase client is not initialized')
    await expect(dataRepository.getDepartments()).rejects.toThrow('Supabase client is not initialized')
  })
})
