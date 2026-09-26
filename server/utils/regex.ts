// Build a literal, case-insensitive Mongo $regex from untrusted input (prevents ReDoS / pattern injection)
export function literalRegex(input: string) {
  return { $regex: input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
}
