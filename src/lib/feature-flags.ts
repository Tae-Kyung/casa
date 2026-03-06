export const FEATURE_FLAGS = {
  MENTORING_SYSTEM: false,
  INSTITUTION_DASHBOARD: false,
  PAYOUT_MANAGEMENT: false,
  MESSAGE_SYSTEM: false,
  NOTIFICATION_SYSTEM: false,
  MULTI_ROLE_SIGNUP: false,
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const envKey = `NEXT_PUBLIC_FF_${flag}`
  const envValue = typeof window !== 'undefined'
    ? (process.env[envKey] as string | undefined)
    : process.env[envKey]

  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1'
  }

  return FEATURE_FLAGS[flag]
}
