import { createClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/roles'

export interface UserReadinessStatus {
  isReady: boolean
  missingFields: string[]
  message: string
}

export async function checkUserReadiness(userId: string): Promise<UserReadinessStatus> {
  try {
    const supabase = await createClient()
    
    // Check if user has the required fields filled by admin
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('onboarding_summary, themes, id, role')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return {
        isReady: false,
        missingFields: ['profile'],
        message: 'Profile not found'
      }
    }

    // Admins bypass readiness checks
    if (profile.role === ROLES.ADMIN) {
      return {
        isReady: true,
        missingFields: [],
        message: 'Admin account'
      }
    }

    // Check if user has long term memory
    const { data: ltm } = await supabase
      .from('user_long_term_memory')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    const missingFields: string[] = []
    
    if (!profile.onboarding_summary || profile.onboarding_summary.trim() === '') {
      missingFields.push('onboarding_summary')
    }
    
    if (!profile.themes || !Array.isArray(profile.themes) || profile.themes.length === 0) {
      missingFields.push('themes')
    }
    
    if (!ltm) {
      missingFields.push('long_term_memory')
    }

    const isReady = missingFields.length === 0

    return {
      isReady,
      missingFields,
      message: isReady 
        ? 'Account is ready' 
        : 'Your account will be activated by the admin in 20 hours'
    }
  } catch (error) {
    console.error('Error checking user readiness:', error)
    return {
      isReady: false,
      missingFields: ['error'],
      message: 'Error checking account status'
    }
  }
}
