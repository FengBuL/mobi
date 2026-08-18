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
  /** 这个号上次在看的稿；正文仍只存在稿列表里 */
  lastPostId?: string | null
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

/** 切到某个号时：只打开属于它的稿。优先上次在看的那篇，没有就新建，绝不能继续用另一号的稿。 */
export function pickPostForProfile(
  posts: ProfilePostRef[],
  profileId: string,
  currentPostId?: string | null,
  lastPostId?: string | null,
) {
  if (lastPostId && posts.some(post => post.id === lastPostId && post.profileId === profileId)) {
    return lastPostId
  }
  const current = posts.find(post => post.id === currentPostId)
  if (current && current.profileId === profileId) {
    return current.id
  }
  return posts.find(post => post.profileId === profileId)?.id
}

/** 删掉正在看的号时，回到还属于默认号的稿，避免第二号的稿顶掉第一号。 */
export function pickPostAfterProfileDelete(input: {
  postsBefore: ProfilePostRef[]
  currentPostId: string
  deleteId: string
  fallbackProfileId: string
}) {
  const current = input.postsBefore.find(post => post.id === input.currentPostId)
  if (!current || current.profileId !== input.deleteId) {
    return input.currentPostId
  }
  const kept = input.postsBefore.find(post => post.profileId === input.fallbackProfileId)
  return kept?.id ?? input.currentPostId
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
