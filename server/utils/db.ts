import { drizzle } from 'drizzle-orm/d1'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'
import type { D1Database, ExecutionContext, R2Bucket } from '@cloudflare/workers-types'
import * as schema from '../db/schema'

export type Db = DrizzleD1Database<typeof schema>

export interface Env {
  DB: D1Database
  LOGOS: R2Bucket
}

export function useCloudflareEnv(event: H3Event): Env {
  const env = event.context.cloudflare?.env as Env | undefined
  if (!env) {
    throw createError({ statusCode: 500, statusMessage: 'Cloudflare bindings are not available.' })
  }
  return env
}

export function useDb(event: H3Event): Db {
  if (!event.context.db) {
    event.context.db = drizzle(useCloudflareEnv(event).DB, { schema })
  }
  return event.context.db
}

// 24-hex ids, same shape as the MongoDB ObjectIds the data was migrated from
export function newId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0')
  const random = new Uint8Array(8)
  crypto.getRandomValues(random)
  return timestamp + Array.from(random, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{24}$/.test(value)
}

// D1 caps bound parameters per statement at 100
export async function inChunks<T, R>(items: T[], run: (chunk: T[]) => Promise<R[]>, size = 90): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += size) {
    results.push(...await run(items.slice(i, i + size)))
  }
  return results
}

// LIKE pattern for a literal, case-insensitive substring match (use with ESCAPE '\')
export function likePattern(input: string): string {
  return `%${input.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}

declare module 'h3' {
  interface H3EventContext {
    db?: Db
    cloudflare?: { env: Env; context: ExecutionContext }
  }
}
