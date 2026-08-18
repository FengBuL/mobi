export const DEFAULT_PROFILE_ID = `profile-default`
export const DEFAULT_PROFILE_NAME = `我的号`

export interface MpConfigSnapshot {
  proxyOrigin: string
  appID: string
  appsecret: string
}

export interface AccountProfileConfig {
  theme: string
  fontFamily: string
  fontSize: string
  primaryColor: string
  primaryColorSource: `theme` | `manual`
  isCiteStatus: boolean
  imgHost: string
  mpConfig: MpConfigSnapshot
}

export interface AccountProfile {
  id: string
  name: string
  isDefault?: boolean
  config: AccountProfileConfig
}

export interface ProfilePostRef {
  id: string
  profileId?: string | null
}

function cloneConfig(config: AccountProfileConfig): AccountProfileConfig {
  return {
    ...config,
    mpConfig: { ...config.mpConfig },
  }
}

function cloneProfile(profile: AccountProfile): AccountProfile {
  return {
    ...profile,
    config: cloneConfig(profile.config),
  }
}

export function snapshotEquals(left: AccountProfileConfig, right: AccountProfileConfig) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function getDefaultProfileId(profiles: AccountProfile[]) {
  return profiles.find(profile => profile.isDefault)?.id ?? profiles[0]?.id ?? DEFAULT_PROFILE_ID
}

export function resolveProfileId(profileId: string | null | undefined, profiles: AccountProfile[]) {
  if (profileId && profiles.some(profile => profile.id === profileId)) {
    return profileId
  }
  return getDefaultProfileId(profiles)
}

export function assignPostProfileId(currentProfileId: string) {
  return currentProfileId
}

function attachPosts(posts: ProfilePostRef[], profiles: AccountProfile[]): ProfilePostRef[] {
  return posts.map(post => ({
    id: post.id,
    profileId: resolveProfileId(post.profileId, profiles),
  }))
}

export function migrateAccountProfiles(input: {
  profiles: AccountProfile[] | null | undefined
  currentProfileId: string | null | undefined
  legacy: AccountProfileConfig
  posts: ProfilePostRef[]
}) {
  const existing = (input.profiles ?? []).filter(profile => profile?.id && profile.config)
  if (existing.length > 0) {
    const profiles = existing.map(cloneProfile)
    if (!profiles.some(profile => profile.isDefault)) {
      profiles[0].isDefault = true
    }
    return {
      profiles,
      currentProfileId: resolveProfileId(input.currentProfileId, profiles),
      posts: attachPosts(input.posts, profiles),
    }
  }

  const profiles: AccountProfile[] = [{
    id: DEFAULT_PROFILE_ID,
    name: DEFAULT_PROFILE_NAME,
    isDefault: true,
    config: cloneConfig(input.legacy),
  }]

  return {
    profiles,
    currentProfileId: DEFAULT_PROFILE_ID,
    posts: attachPosts(input.posts, profiles),
  }
}

export function createAccountProfile(
  profiles: AccountProfile[],
  name: string,
  config: AccountProfileConfig,
) {
  const created: AccountProfile = {
    id: `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || `未命名号`,
    isDefault: false,
    config: cloneConfig(config),
  }

  return {
    profiles: [...profiles.map(cloneProfile), created],
    created,
  }
}

export function renameAccountProfile(profiles: AccountProfile[], id: string, name: string) {
  const nextName = name.trim()
  return profiles.map((profile) => {
    if (profile.id !== id) {
      return cloneProfile(profile)
    }
    return {
      ...cloneProfile(profile),
      name: nextName || profile.name,
    }
  })
}

export function deleteAccountProfile(input: {
  profiles: AccountProfile[]
  currentProfileId: string
  deleteId: string
  posts: ProfilePostRef[]
}) {
  if (input.profiles.length <= 1) {
    throw new Error(`不能删除最后一个号`)
  }

  const remaining = input.profiles
    .filter(profile => profile.id !== input.deleteId)
    .map(cloneProfile)

  if (!remaining.some(profile => profile.isDefault)) {
    remaining[0].isDefault = true
  }

  return {
    profiles: remaining,
    currentProfileId: resolveProfileId(
      input.currentProfileId === input.deleteId ? `` : input.currentProfileId,
      remaining,
    ),
    posts: attachPosts(input.posts, remaining),
  }
}
