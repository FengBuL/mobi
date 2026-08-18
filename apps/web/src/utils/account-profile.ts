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

export const ACCOUNT_PROFILE_EXPORT_KIND = `mobi-account-profiles`
export const ACCOUNT_PROFILE_EXPORT_VERSION = 1
export const RECENT_BLOCK_PRESET_LIMIT = 8

export interface AccountProfile {
  id: string
  name: string
  isDefault?: boolean
  /** 这个号上次在看的稿；正文仍只存在稿列表里 */
  lastPostId?: string | null
  /** 这个号最近用过的板块样式，只记预设 id */
  recentBlockPresets?: string[]
  config: AccountProfileConfig
}

export interface AccountProfileExportItem {
  name: string
  config: AccountProfileConfig
  recentBlockPresets?: string[]
}

export interface AccountProfileExportPayload {
  kind: typeof ACCOUNT_PROFILE_EXPORT_KIND
  version: number
  exportedAt: string
  profiles: AccountProfileExportItem[]
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
    recentBlockPresets: [...(profile.recentBlockPresets ?? [])],
    config: cloneConfig(profile.config),
  }
}

export function rememberRecentBlockPreset(
  recent: readonly string[] | null | undefined,
  presetId: string,
  limit = RECENT_BLOCK_PRESET_LIMIT,
) {
  const id = presetId.trim()
  if (!id) {
    return [...(recent ?? [])]
  }
  return [id, ...(recent ?? []).filter(item => item !== id)].slice(0, limit)
}

export function rankPresetsByRecent<T extends { id: string }>(
  presets: readonly T[],
  recent: readonly string[] | null | undefined,
) {
  const order = new Map((recent ?? []).map((id, index) => [id, index]))
  const original = new Map(presets.map((preset, index) => [preset.id, index]))
  return [...presets].sort((left, right) => {
    const leftRecent = order.get(left.id) ?? Number.POSITIVE_INFINITY
    const rightRecent = order.get(right.id) ?? Number.POSITIVE_INFINITY
    if (leftRecent !== rightRecent) {
      return leftRecent - rightRecent
    }
    return (original.get(left.id) ?? 0) - (original.get(right.id) ?? 0)
  })
}

export function buildAccountProfileExport(profiles: AccountProfile[]): AccountProfileExportPayload {
  return {
    kind: ACCOUNT_PROFILE_EXPORT_KIND,
    version: ACCOUNT_PROFILE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profiles: profiles.map(profile => ({
      name: profile.name,
      config: cloneConfig(profile.config),
      recentBlockPresets: [...(profile.recentBlockPresets ?? [])],
    })),
  }
}

function readImportedConfig(value: unknown): AccountProfileConfig | null {
  if (!value || typeof value !== `object`) {
    return null
  }
  const config = value as Partial<AccountProfileConfig>
  if (typeof config.theme !== `string` || typeof config.fontFamily !== `string` || typeof config.fontSize !== `string`) {
    return null
  }
  const mpConfig = config.mpConfig && typeof config.mpConfig === `object`
    ? config.mpConfig
    : { proxyOrigin: ``, appID: ``, appsecret: `` }
  return {
    theme: config.theme,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    primaryColor: typeof config.primaryColor === `string` ? config.primaryColor : `#151515`,
    primaryColorSource: config.primaryColorSource === `manual` ? `manual` : `theme`,
    isCiteStatus: Boolean(config.isCiteStatus),
    imgHost: typeof config.imgHost === `string` && config.imgHost ? config.imgHost : `default`,
    mpConfig: {
      proxyOrigin: typeof mpConfig.proxyOrigin === `string` ? mpConfig.proxyOrigin : ``,
      appID: typeof mpConfig.appID === `string` ? mpConfig.appID : ``,
      appsecret: typeof mpConfig.appsecret === `string` ? mpConfig.appsecret : ``,
    },
  }
}

export function parseAccountProfileImport(raw: string): AccountProfileExportPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AccountProfileExportPayload>
    if (parsed.kind !== ACCOUNT_PROFILE_EXPORT_KIND || !Array.isArray(parsed.profiles)) {
      return null
    }
    const profiles: AccountProfileExportItem[] = []
    parsed.profiles.forEach((item) => {
      if (!item || typeof item.name !== `string` || !item.name.trim()) {
        return
      }
      const config = readImportedConfig(item.config)
      if (!config) {
        return
      }
      profiles.push({
        name: item.name.trim(),
        config,
        recentBlockPresets: Array.isArray(item.recentBlockPresets)
          ? item.recentBlockPresets.filter(id => typeof id === `string` && Boolean(id.trim()))
          : [],
      })
    })
    if (profiles.length === 0) {
      return null
    }
    return {
      kind: ACCOUNT_PROFILE_EXPORT_KIND,
      version: ACCOUNT_PROFILE_EXPORT_VERSION,
      exportedAt: typeof parsed.exportedAt === `string` ? parsed.exportedAt : ``,
      profiles,
    }
  }
  catch {
    return null
  }
}

export function uniqueImportedProfileName(existingNames: readonly string[], desiredName: string) {
  const base = desiredName.trim() || `未命名号`
  const taken = new Set(existingNames)
  if (!taken.has(base)) {
    return base
  }
  let index = 2
  while (taken.has(`${base} ${index}`)) {
    index += 1
  }
  return `${base} ${index}`
}

export function collectImportedNameConflicts(existing: AccountProfile[], incoming: AccountProfileExportItem[]) {
  const names = new Set(existing.map(profile => profile.name))
  return incoming.filter(item => names.has(item.name)).map(item => item.name)
}

export function describeAccountProfileImport(result: { added: number, updated: number }) {
  if (result.added > 0) {
    return `已导入：更新 ${result.updated} 个，新增 ${result.added} 个。主题条和设置里可以切号。稿子不会跟着过来。`
  }
  return `已导入：更新 ${result.updated} 个。还是这些号，配置已覆盖。稿子不会跟着过来。`
}

export function mergeImportedProfiles(
  existing: AccountProfile[],
  incoming: AccountProfileExportItem[],
  conflict: `overwrite` | `add` = `overwrite`,
) {
  let profiles = existing.map(cloneProfile)
  let added = 0
  let updated = 0

  incoming.forEach((item) => {
    const index = profiles.findIndex(profile => profile.name === item.name)
    if (index >= 0 && conflict === `overwrite`) {
      profiles[index] = {
        ...profiles[index],
        recentBlockPresets: [...(item.recentBlockPresets ?? [])],
        config: cloneConfig(item.config),
      }
      updated += 1
      return
    }

    const name = index >= 0
      ? uniqueImportedProfileName(profiles.map(profile => profile.name), item.name)
      : item.name
    const created = createAccountProfile(profiles, name, item.config)
    profiles = created.profiles.map((profile) => {
      if (profile.id !== created.created.id) {
        return profile
      }
      return {
        ...profile,
        recentBlockPresets: [...(item.recentBlockPresets ?? [])],
      }
    })
    added += 1
  })

  return { profiles, added, updated }
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
