import { describe, expect, it } from 'vitest'
import {
  assignPostProfileId,
  createAccountProfile,
  DEFAULT_PROFILE_ID,
  DEFAULT_PROFILE_NAME,
  deleteAccountProfile,
  migrateAccountProfiles,
  pickPostAfterProfileDelete,
  pickPostForProfile,
  renameAccountProfile,
  resolveProfileId,
  snapshotEquals,
} from '../apps/web/src/utils/account-profile'

const legacyA = {
  theme: `default`,
  fontFamily: `"PingFang SC"`,
  fontSize: `14px`,
  primaryColor: `#0a0a0a`,
  primaryColorSource: `theme` as const,
  isCiteStatus: false,
  imgHost: `mp`,
  mpConfig: { proxyOrigin: ``, appID: `wxAAA`, appsecret: `secret-a` },
}

const legacyB = {
  ...legacyA,
  theme: `ink`,
  fontSize: `16px`,
  primaryColor: `#b93a26`,
  primaryColorSource: `manual` as const,
  isCiteStatus: true,
  mpConfig: { proxyOrigin: `http://127.0.0.1:8788`, appID: `wxBBB`, appsecret: `secret-b` },
}

describe(`我的号：迁移`, () => {
  it(`没有号记录时，老用户全局配置变成默认号，稿子挂上这个号`, () => {
    const result = migrateAccountProfiles({
      profiles: [],
      currentProfileId: ``,
      legacy: legacyA,
      posts: [{ id: `p1` }, { id: `p2`, profileId: `` }],
    })

    expect(result.profiles).toHaveLength(1)
    expect(result.profiles[0]).toMatchObject({
      id: DEFAULT_PROFILE_ID,
      name: DEFAULT_PROFILE_NAME,
      isDefault: true,
      config: legacyA,
    })
    expect(result.currentProfileId).toBe(DEFAULT_PROFILE_ID)
    expect(result.posts.map(post => post.profileId)).toEqual([DEFAULT_PROFILE_ID, DEFAULT_PROFILE_ID])
  })

  it(`已经有号时不再另造一份，只补孤儿稿`, () => {
    const existing = createAccountProfile([], `专栏号`, legacyB).profiles
    const result = migrateAccountProfiles({
      profiles: existing,
      currentProfileId: existing[0].id,
      legacy: legacyA,
      posts: [{ id: `p1` }, { id: `p2`, profileId: existing[0].id }],
    })

    expect(result.profiles).toHaveLength(1)
    expect(result.profiles[0].config.theme).toBe(`ink`)
    expect(result.currentProfileId).toBe(existing[0].id)
    expect(result.posts[0].profileId).toBe(existing[0].id)
    expect(result.posts[1].profileId).toBe(existing[0].id)
  })
})

describe(`我的号：切换与新建`, () => {
  it(`新建号克隆当前配置，不改已有号`, () => {
    const first = migrateAccountProfiles({
      profiles: [],
      currentProfileId: ``,
      legacy: legacyA,
      posts: [],
    })
    const created = createAccountProfile(first.profiles, `第二个号`, legacyB)

    expect(created.profiles).toHaveLength(2)
    expect(created.profiles[0].config).toEqual(legacyA)
    expect(created.created.name).toBe(`第二个号`)
    expect(created.created.config).toEqual(legacyB)
    expect(created.created.id).not.toBe(DEFAULT_PROFILE_ID)
    expect(created.created.isDefault).toBe(false)
  })

  it(`切回第一个号时两套配置互不污染`, () => {
    const first = migrateAccountProfiles({
      profiles: [],
      currentProfileId: ``,
      legacy: legacyA,
      posts: [],
    })
    const two = createAccountProfile(first.profiles, `第二个号`, legacyB)
    const back = two.profiles.find(profile => profile.id === DEFAULT_PROFILE_ID)!
    const other = two.profiles.find(profile => profile.id !== DEFAULT_PROFILE_ID)!

    expect(snapshotEquals(back.config, legacyA)).toBe(true)
    expect(snapshotEquals(other.config, legacyB)).toBe(true)
    expect(snapshotEquals(back.config, other.config)).toBe(false)
  })

  it(`新稿套当前号`, () => {
    expect(assignPostProfileId(`profile-2`)).toBe(`profile-2`)
  })
})

describe(`我的号：重命名与删除`, () => {
  it(`可以重命名，删号不删稿，孤儿落回默认号`, () => {
    const first = migrateAccountProfiles({
      profiles: [],
      currentProfileId: ``,
      legacy: legacyA,
      posts: [{ id: `p1` }],
    })
    const two = createAccountProfile(first.profiles, `临时号`, legacyB)
    const extraId = two.created.id
    const renamed = renameAccountProfile(two.profiles, extraId, `晚间号`)
    expect(renamed.find(profile => profile.id === extraId)?.name).toBe(`晚间号`)

    const removed = deleteAccountProfile({
      profiles: renamed,
      currentProfileId: extraId,
      deleteId: extraId,
      posts: [{ id: `p1`, profileId: extraId }, { id: `p2`, profileId: DEFAULT_PROFILE_ID }],
    })

    expect(removed.profiles).toHaveLength(1)
    expect(removed.profiles[0].id).toBe(DEFAULT_PROFILE_ID)
    expect(removed.currentProfileId).toBe(DEFAULT_PROFILE_ID)
    expect(removed.posts.map(post => post.profileId)).toEqual([DEFAULT_PROFILE_ID, DEFAULT_PROFILE_ID])
    expect(removed.posts).toHaveLength(2)
  })

  it(`不能删除最后一个号`, () => {
    const first = migrateAccountProfiles({
      profiles: [],
      currentProfileId: ``,
      legacy: legacyA,
      posts: [],
    })

    expect(() => deleteAccountProfile({
      profiles: first.profiles,
      currentProfileId: DEFAULT_PROFILE_ID,
      deleteId: DEFAULT_PROFILE_ID,
      posts: [],
    })).toThrow(/最后一个/)
  })

  it(`打开孤儿稿时落回默认号`, () => {
    const first = migrateAccountProfiles({
      profiles: [],
      currentProfileId: ``,
      legacy: legacyA,
      posts: [],
    })
    expect(resolveProfileId(`ghost`, first.profiles)).toBe(DEFAULT_PROFILE_ID)
    expect(resolveProfileId(undefined, first.profiles)).toBe(DEFAULT_PROFILE_ID)
  })

  it(`删号后第一个号的配置必须仍是自己的，不能被第二个号的现场覆盖`, () => {
    const first = migrateAccountProfiles({
      profiles: [],
      currentProfileId: ``,
      legacy: legacyA,
      posts: [{ id: `draft-a`, profileId: DEFAULT_PROFILE_ID }],
    })
    const two = createAccountProfile(first.profiles, `第二个号`, legacyB)
    const extraId = two.created.id
    const removed = deleteAccountProfile({
      profiles: two.profiles,
      currentProfileId: extraId,
      deleteId: extraId,
      posts: [
        { id: `draft-a`, profileId: DEFAULT_PROFILE_ID },
        { id: `draft-b`, profileId: extraId },
      ],
    })

    expect(removed.profiles[0].config).toEqual(legacyA)
    expect(snapshotEquals(removed.profiles[0].config, legacyB)).toBe(false)
  })

  it(`删掉正在看的第二个号时，应回到第一个号自己的稿，而不是把第二号的稿当成第一号`, () => {
    const extraId = `profile-second`
    expect(pickPostAfterProfileDelete({
      postsBefore: [
        { id: `draft-a`, profileId: DEFAULT_PROFILE_ID },
        { id: `draft-b`, profileId: extraId },
      ],
      currentPostId: `draft-b`,
      deleteId: extraId,
      fallbackProfileId: DEFAULT_PROFILE_ID,
    })).toBe(`draft-a`)
  })

  it(`切到没有自己稿的号时，不能继续用另一号的稿`, () => {
    expect(pickPostForProfile(
      [{ id: `draft-a`, profileId: DEFAULT_PROFILE_ID }],
      `profile-second`,
      `draft-a`,
    )).toBeUndefined()
  })

  it(`切号只打开属于该号的稿，优先上次在看的那篇`, () => {
    expect(pickPostForProfile(
      [
        { id: `draft-a`, profileId: DEFAULT_PROFILE_ID },
        { id: `draft-b1`, profileId: `profile-second` },
        { id: `draft-b2`, profileId: `profile-second` },
      ],
      `profile-second`,
      `draft-a`,
      `draft-b2`,
    )).toBe(`draft-b2`)
    expect(pickPostForProfile(
      [
        { id: `draft-a`, profileId: DEFAULT_PROFILE_ID },
        { id: `draft-b`, profileId: `profile-second` },
      ],
      `profile-second`,
      `draft-a`,
      `draft-a`,
    )).toBe(`draft-b`)
  })
})
