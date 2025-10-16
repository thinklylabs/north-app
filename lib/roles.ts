// Role constants for type safety and consistency
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin'
} as const

// Type definitions for better TypeScript support
export type UserRole = typeof ROLES[keyof typeof ROLES]

export interface UserProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  website_url?: string
  company_name?: string
  website_content?: string
  role: UserRole
  created_at: string
  updated_at: string
}
