import { UserRole } from './auth'

// Role constants for better type safety
export const ROLES = {
  USER: 'user' as const,
  ADMIN: 'admin' as const,
} as const

// Type guard functions
export function isAdmin(role: UserRole): boolean {
  return role === ROLES.ADMIN
}

export function isUser(role: UserRole): boolean {
  return role === ROLES.USER
}

// Role validation
export function isValidRole(role: string): role is UserRole {
  return role === ROLES.USER || role === ROLES.ADMIN
}

// Role hierarchy (for future use if you add more roles)
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy = {
    [ROLES.USER]: 1,
    [ROLES.ADMIN]: 2,
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}
