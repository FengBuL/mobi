import type { ThemeName } from '@mobi/shared/configs'
import type { AccountProfile, AccountProfileConfig, MpConfigSnapshot } from '@/utils/account-profile'
import { addPrefix } from '@/utils'
import {
  createAccountProfile,
  deleteAccountProfile,
  migrateAccountProfiles,
  pickPostAfterProfileDelete,
  pickPostForProfile,
  renameAccountProfile,
  resolveProfileId,
} from '@/utils/account-profile'
import { store } from '@/utils/storage'
import { useEditorStore } from './editor'
import { usePostStore } from './post'
import { useRenderStore } from './render'
import { useThemeStore } from './theme'
import { useThemeDesignerStore } from './themeDesigner'

const EMPTY_MP_CONFIG: MpConfigSnapshot = {
  proxyOrigin: ``,
  appID: ``,
  appsecret: ``,
}

export const useAccountProfileStore = defineStore(`accountProfile`, () => {
  const themeStore = useThemeStore()
  const themeDesignerStore = useThemeDesignerStore()
  const postStore = usePostStore()
  const editorStore = useEditorStore()
  const renderStore = useRenderStore()

  const imgHost = store.reactive(`imgHost`, `default`)
  const mpConfig = store.reactive<MpConfigSnapshot>(`mpConfig`, { ...EMPTY_MP_CONFIG })
  const profiles = store.reactive<AccountProfile[]>(addPrefix(`account_profiles`), [])
  const currentProfileId = store.reactive(addPrefix(`current_profile_id`), ``)

  let suppressPersist = false
  let ready = false

  function readLegacyConfig(): AccountProfileConfig {
    const source = themeStore.primaryColorSource === `manual` ? `manual` : `theme`
    return {
      theme: themeStore.theme,
      fontFamily: themeStore.fontFamily,
      fontSize: themeStore.fontSize,
      primaryColor: themeStore.primaryColor,
      primaryColorSource: source,
      isCiteStatus: themeStore.isCiteStatus,
      imgHost: imgHost.value || `default`,
      mpConfig: { ...EMPTY_MP_CONFIG, ...mpConfig.value },
    }
  }

  function persistCurrentConfig() {
    if (suppressPersist || !ready) {
      return
    }
    const index = profiles.value.findIndex(profile => profile.id === currentProfileId.value)
    if (index < 0) {
      return
    }
    profiles.value[index] = {
      ...profiles.value[index],
      config: readLegacyConfig(),
    }
  }

  function refreshPreview() {
    themeStore.updateCodeTheme()
    void themeStore.applyCurrentTheme()
    try {
      const content = editorStore.getContent?.() ?? ``
      renderStore.render(renderStore.resolvePreviewContent(content))
    }
    catch {
      // 编辑器还没挂上时只先把主题写进去
    }
  }

  function applyProfile(id: string) {
    const profile = profiles.value.find(item => item.id === id)
    if (!profile) {
      return
    }

    suppressPersist = true
    const config = cloneAppliedConfig(profile.config)
    currentProfileId.value = profile.id
    themeDesignerStore.replaceDraft({
      sourceId: null,
      name: ``,
      baseTheme: config.theme as ThemeName,
      tokens: {},
    }, false)
    themeStore.theme = config.theme as ThemeName
    themeStore.fontFamily = config.fontFamily
    themeStore.fontSize = config.fontSize
    themeStore.restorePrimaryColorState(config.primaryColor, config.primaryColorSource)
    themeStore.isCiteStatus = config.isCiteStatus
    imgHost.value = config.imgHost || `default`
    mpConfig.value = { ...EMPTY_MP_CONFIG, ...config.mpConfig }
    refreshPreview()
    void nextTick(() => {
      void nextTick(() => {
        suppressPersist = false
      })
    })
  }

  function cloneAppliedConfig(config: AccountProfileConfig): AccountProfileConfig {
    return {
      ...config,
      mpConfig: { ...EMPTY_MP_CONFIG, ...config.mpConfig },
    }
  }

  function activateProfile(id: string) {
    persistCurrentConfig()
    applyProfile(id)
    const nextPostId = pickPostForProfile(
      postStore.posts.map(post => ({ id: post.id, profileId: post.profileId })),
      id,
      postStore.currentPostId,
    )
    if (nextPostId && nextPostId !== postStore.currentPostId) {
      postStore.currentPostId = nextPostId
    }
  }

  function hydrate() {
    const migrated = migrateAccountProfiles({
      profiles: profiles.value,
      currentProfileId: currentProfileId.value,
      legacy: readLegacyConfig(),
      posts: postStore.posts.map(post => ({ id: post.id, profileId: post.profileId })),
    })
    profiles.value = migrated.profiles
    currentProfileId.value = migrated.currentProfileId
    migrated.posts.forEach((item) => {
      const post = postStore.getPostById(item.id)
      if (post && post.profileId !== item.profileId) {
        post.profileId = item.profileId
      }
    })
    ready = true
    applyProfile(currentProfileId.value)
  }

  function switchProfile(id: string) {
    const resolved = resolveProfileId(id, profiles.value)
    if (resolved === currentProfileId.value && ready) {
      return
    }
    activateProfile(resolved)
  }

  function createProfile(name?: string) {
    persistCurrentConfig()
    const label = name?.trim() || `号 ${profiles.value.length + 1}`
    const created = createAccountProfile(profiles.value, label, readLegacyConfig())
    profiles.value = created.profiles
    activateProfile(created.created.id)
    return created.created
  }

  function renameProfile(id: string, name: string) {
    profiles.value = renameAccountProfile(profiles.value, id, name)
  }

  function removeProfile(id: string) {
    const postsBefore = postStore.posts.map(post => ({ id: post.id, profileId: post.profileId }))
    const removed = deleteAccountProfile({
      profiles: profiles.value,
      currentProfileId: currentProfileId.value,
      deleteId: id,
      posts: postsBefore,
    })
    const nextPostId = pickPostAfterProfileDelete({
      postsBefore,
      currentPostId: postStore.currentPostId,
      deleteId: id,
      fallbackProfileId: removed.currentProfileId,
    })

    suppressPersist = true
    profiles.value = removed.profiles
    removed.posts.forEach((item) => {
      const post = postStore.getPostById(item.id)
      if (post) {
        post.profileId = item.profileId
      }
    })
    if (nextPostId && nextPostId !== postStore.currentPostId) {
      postStore.currentPostId = nextPostId
    }
    applyProfile(removed.currentProfileId)
  }

  const currentProfile = computed(() => {
    return profiles.value.find(profile => profile.id === currentProfileId.value) ?? profiles.value[0]
  })

  const showSwitcher = computed(() => profiles.value.length > 1)

  watch(
    () => [
      themeStore.theme,
      themeStore.fontFamily,
      themeStore.fontSize,
      themeStore.primaryColor,
      themeStore.primaryColorSource,
      themeStore.isCiteStatus,
      imgHost.value,
      mpConfig.value,
    ],
    persistCurrentConfig,
    { deep: true },
  )

  watch(() => postStore.currentPostId, (postId) => {
    if (!ready || !postId) {
      return
    }
    const post = postStore.getPostById(postId)
    if (!post) {
      return
    }
    if (!post.profileId) {
      post.profileId = currentProfileId.value
      return
    }
    const resolved = resolveProfileId(post.profileId, profiles.value)
    if (post.profileId !== resolved) {
      post.profileId = resolved
    }
    if (resolved !== currentProfileId.value) {
      applyProfile(resolved)
    }
  })

  hydrate()

  return {
    profiles,
    currentProfileId,
    currentProfile,
    showSwitcher,
    imgHost,
    mpConfig,
    switchProfile,
    createProfile,
    renameProfile,
    removeProfile,
  }
})
