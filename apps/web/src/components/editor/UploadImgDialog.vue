<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/yup'
import { Field, Form } from 'vee-validate'
import * as yup from 'yup'
import { isDesktopRuntime } from '@/services/desktop/bridge'
import { DEFAULT_MP_PROXY_ORIGIN, OFFICIAL_MP_PROXY_ORIGIN } from '@/services/wechat'
import { useUIStore } from '@/stores/ui'
import { CUSTOM_UPLOAD_SCRIPT_STORAGE_KEY } from '@/utils/file'
import { prepareMpProxySubmission, sanitizeStoredMpProxyOrigin, saveAndSelectImageHost, validateMpProxyBeforeSave } from '@/utils/image-host-config'
import { store } from '@/utils/storage'
import { trackEvent } from '@/utils/telemetry'

const uiStore = useUIStore()
const { enableImageReupload } = storeToRefs(uiStore)
const { toggleImageReupload } = uiStore
const imgHost = store.reactive(`imgHost`, `default`)

// github
const githubSchema = toTypedSchema(yup.object({
  repo: yup.string().required(`GitHub 仓库不能为空`),
  branch: yup.string().optional(),
  accessToken: yup.string().required(`GitHub Token 不能为空`),
  useCDN: yup.boolean().required(),
}))

const githubConfig = store.reactive(`githubConfig`, { repo: ``, branch: ``, accessToken: ``, useCDN: false })

async function githubSubmit(formValues: any) {
  Object.assign(githubConfig.value, formValues)
  toast.success(`保存成功`)
}

// 阿里云
const aliOSSSchema = toTypedSchema(yup.object({
  accessKeyId: yup.string().required(`AccessKey ID 不能为空`),
  accessKeySecret: yup.string().required(`AccessKey Secret 不能为空`),
  bucket: yup.string().required(`Bucket 不能为空`),
  region: yup.string().required(`Region 不能为空`),
  useSSL: yup.boolean().required(),
  cdnHost: yup.string().optional(),
  path: yup.string().optional(),
}))

const aliOSSConfig = store.reactive(`aliOSSConfig`, {
  accessKeyId: ``,
  accessKeySecret: ``,
  bucket: ``,
  region: ``,
  useSSL: true,
  cdnHost: ``,
  path: ``,
})

async function aliOSSSubmit(formValues: any) {
  Object.assign(aliOSSConfig.value, formValues)
  toast.success(`保存成功`)
}

// 腾讯云
const txCOSSchema = toTypedSchema(yup.object({
  secretId: yup.string().required(`Secret ID 不能为空`),
  secretKey: yup.string().required(`Secret Key 不能为空`),
  bucket: yup.string().required(`Bucket 不能为空`),
  region: yup.string().required(`Region 不能为空`),
  cdnHost: yup.string().optional(),
  path: yup.string().optional(),
}))

const txCOSConfig = store.reactive(`txCOSConfig`, {
  secretId: ``,
  secretKey: ``,
  bucket: ``,
  region: ``,
  cdnHost: ``,
  path: ``,
})

async function txCOSSubmit(formValues: any) {
  Object.assign(txCOSConfig.value, formValues)
  toast.success(`保存成功`)
}

// 七牛云
const qiniuSchema = toTypedSchema(yup.object({
  accessKey: yup.string().required(`AccessKey 不能为空`),
  secretKey: yup.string().required(`SecretKey 不能为空`),
  bucket: yup.string().required(`Bucket 不能为空`),
  domain: yup.string().required(`Bucket 对应域名不能为空`),
  region: yup.string().optional(),
  path: yup.string().optional(),
}))

const qiniuConfig = store.reactive(`qiniuConfig`, {
  accessKey: ``,
  secretKey: ``,
  bucket: ``,
  domain: ``,
  region: ``,
  path: ``,
})

async function qiniuSubmit(formValues: any) {
  Object.assign(qiniuConfig.value, formValues)
  toast.success(`保存成功`)
}

// MinIO
const minioOSSSchema = toTypedSchema(yup.object({
  endpoint: yup.string().required(`Endpoint 不能为空`),
  port: yup.string().optional(),
  useSSL: yup.boolean().required(),
  bucket: yup.string().required(`Bucket 不能为空`),
  accessKey: yup.string().required(`AccessKey 不能为空`),
  secretKey: yup.string().required(`SecretKey 不能为空`),
}))

const minioOSSConfig = store.reactive(`minioConfig`, {
  endpoint: ``,
  port: ``,
  useSSL: true,
  bucket: ``,
  accessKey: ``,
  secretKey: ``,
})

async function minioOSSSubmit(formValues: any) {
  Object.assign(minioOSSConfig.value, formValues)
  toast.success(`保存成功`)
}

// S3
const s3Schema = toTypedSchema(yup.object({
  endpoint: yup.string().optional(),
  region: yup.string().required(`Region 不能为空`),
  bucket: yup.string().required(`Bucket 不能为空`),
  accessKeyId: yup.string().required(`AccessKey ID 不能为空`),
  accessKeySecret: yup.string().required(`Secret AccessKey 不能为空`),
  path: yup.string().optional(),
  cdnHost: yup.string().optional(),
  pathStyle: yup.boolean().optional(),
}))

const s3Config = store.reactive(`s3Config`, {
  endpoint: ``,
  region: ``,
  bucket: ``,
  accessKeyId: ``,
  accessKeySecret: ``,
  path: ``,
  cdnHost: ``,
  pathStyle: false,
})

async function s3Submit(formValues: any) {
  Object.assign(s3Config.value, formValues)
  toast.success(`保存成功`)
}

// Telegram 图床
const telegramSchema = toTypedSchema(
  yup.object({
    token: yup.string().required(`Bot Token 不能为空`),
    chatId: yup.string().required(`Chat ID 不能为空`),
  }),
)

const telegramConfig = store.reactive(`telegramConfig`, { token: ``, chatId: `` })

async function telegramSubmit(values: any) {
  Object.assign(telegramConfig.value, values)
  toast.success(`保存成功`)
}

// 公众号
// 当前是否为网页（http/https 协议）
const isWebsite = window.location.protocol.startsWith(`http`)

// Cloudflare Workers 环境
const isCfWorkers = import.meta.env.CF_WORKERS === `1`

// 插件模式运行（如 chrome-extension://）
const isPluginMode = !isWebsite

// 桌面版由主进程转发微信接口，不需要代理；开发时页面同样跑在 http 上，所以单独判断
const isDesktopApp = isDesktopRuntime()

// 是否需要填写 proxyOrigin（只在 非插件、非CF页面、非桌面版 时需要）
const isProxyRequired = computed(() => {
  return !isPluginMode && !isCfWorkers && !isDesktopApp
})

const isDevRuntime = import.meta.env.DEV
const showCustomMpProxy = ref(true)
const mpSchema = computed(() =>
  toTypedSchema(yup.object({
    proxyOrigin: yup.string().optional(),
    appID: yup.string().required(`AppID 不能为空`),
    appsecret: yup.string().required(`AppSecret 不能为空`),
  })),
)

const mpConfig = store.reactive(`mpConfig`, {
  proxyOrigin: ``,
  appID: ``,
  appsecret: ``,
})
const storedMpProxyOrigin = mpConfig.value.proxyOrigin
const sanitizedMpProxyOrigin = sanitizeStoredMpProxyOrigin(storedMpProxyOrigin, [
  OFFICIAL_MP_PROXY_ORIGIN,
  DEFAULT_MP_PROXY_ORIGIN,
])
if (sanitizedMpProxyOrigin !== storedMpProxyOrigin) {
  mpConfig.value.proxyOrigin = sanitizedMpProxyOrigin
  void store.setJSON(`mpConfig`, mpConfig.value)
}

async function mpSubmit(formValues: any) {
  try {
    const { requestOrigin, storedValues } = prepareMpProxySubmission(formValues, {
      requiresProxy: isProxyRequired.value,
      officialOrigin: DEFAULT_MP_PROXY_ORIGIN,
    })
    await validateMpProxyBeforeSave({
      requiresProxy: isProxyRequired.value,
      proxyOrigin: requestOrigin,
    })
    saveAndSelectImageHost(`mp`, mpConfig, imgHost, storedValues)
    trackEvent(`mp_config_saved`)
    toast.success(`保存成功，公众号图床已启用`)
  }
  catch (error) {
    toast.error((error as Error).message || `公众号图床配置检查失败`)
  }
}

// Cloudflare R2
const r2Schema = toTypedSchema(yup.object({
  accountId: yup.string().required(`Account ID 不能为空`),
  accessKey: yup.string().required(`AccessKey 不能为空`),
  secretKey: yup.string().required(`SecretKey 不能为空`),
  bucket: yup.string().required(`Bucket 不能为空`),
  domain: yup.string().required(`Bucket 对应域名不能为空`),
  path: yup.string().optional(),
}))

const r2Config = store.reactive(`r2Config`, {
  accountId: ``,
  accessKey: ``,
  secretKey: ``,
  bucket: ``,
  domain: ``,
  path: ``,
})

async function r2Submit(formValues: any) {
  Object.assign(r2Config.value, formValues)
  toast.success(`保存成功`)
}

// 又拍云
const upyunSchema = computed(() => toTypedSchema(
  yup.object({
    bucket: yup.string().required(`Bucket 不能为空`),
    operator: yup.string().required(`操作员 不能为空`),
    password: yup.string().required(`密码 不能为空`),
    domain: yup.string().required(`CDN 域名不能为空`),
    path: yup.string().optional(),
  }),
))

const upyunConfig = store.reactive(`upyunConfig`, {
  bucket: ``,
  operator: ``,
  password: ``,
  domain: ``,
  path: ``,
})

async function upyunSubmit(formValues: any) {
  Object.assign(upyunConfig.value, formValues)
  toast.success(`保存成功`)
}

// Cloudinary
const cloudinarySchema = toTypedSchema(
  yup.object({
    cloudName: yup.string().required(`Cloud Name 不能为空`),
    apiKey: yup.string().required(`API Key 不能为空`),
    apiSecret: yup.string().optional(),
    uploadPreset: yup.string().when(`apiSecret`, {
      is: (v: string | undefined) => !v || v.length === 0,
      then: s => s.required(`未填写 apiSecret 时必须提供上传预设名`),
      otherwise: s => s.optional(),
    }),
    folder: yup.string().optional(),
    domain: yup.string().optional(),
  }),
)

const cloudinaryConfig = store.reactive(`cloudinaryConfig`, {
  cloudName: ``,
  apiKey: ``,
  apiSecret: ``,
  uploadPreset: ``,
  folder: ``,
  domain: ``,
})

async function cloudinarySubmit(formValues: any) {
  Object.assign(cloudinaryConfig.value, formValues)
  toast.success(`保存成功`)
}

const options = [
  {
    value: `default`,
    // 保留这一项只是为了让老用户存量的 imgHost=default 还能在下拉里显示出来，
    // 它本身不是一个可用的图床。
    label: `未选择（请先选一个图床）`,
  },
  {
    value: `github`,
    label: `GitHub`,
  },
  {
    value: `aliOSS`,
    label: `阿里云`,
  },
  {
    value: `txCOS`,
    label: `腾讯云`,
  },
  {
    value: `qiniu`,
    label: `七牛云`,
  },
  {
    value: `minio`,
    label: `MinIO`,
  },
  {
    value: `s3`,
    label: `S3`,
  },
  {
    value: `mp`,
    label: `公众号图床`,
  },
  {
    value: `r2`,
    label: `Cloudflare R2`,
  },
  {
    value: `upyun`,
    label: `又拍云`,
  },
  { value: `telegram`, label: `Telegram` },
  {
    value: `cloudinary`,
    label: `Cloudinary`,
  },

  {
    value: `formCustom`,
    label: `自定义代码`,
  },
]

const useCompression = store.reactive(`useCompression`, false)
const formCustomScriptConfirmed = store.reactive(CUSTOM_UPLOAD_SCRIPT_STORAGE_KEY, false)
const activeName = ref(`mp`)
const otherHostOptions = options.filter(item => item.value !== `default` && item.value !== `mp`)
const isOtherHostTab = computed(() => activeName.value !== `mp`)
const secretRiskHint = `AppSecret / Token 存在本机 localStorage，共用设备或扩展可能被读走。`
const mpPrerequisiteHint = `这条路不是填完就能用。要同时有 AppID / AppSecret，并把这台电脑当前的公网 IP 加进公众号「API IP 白名单」。没加或宽带换了 IP，接口会报 40164，不是密钥填错。个人主体通常无法做企业微信认证；家用动态 IP 也会让白名单过期。配不了就不要填：直接复制，图仍是外链；或在公众号后台手工传图，再把 mmbiz 地址贴回来。`

function openOtherHosts() {
  if (activeName.value === `mp`) {
    activeName.value = imgHost.value !== `mp` && imgHost.value !== `default`
      ? imgHost.value
      : `general`
  }
}

// 别处（板块库、复制警告）可以要求打开时直接定位到某个图床页签
watch(() => uiStore.isShowUploadImgDialog, (open) => {
  if (open && uiStore.uploadImgDialogInitialTab) {
    activeName.value = uiStore.uploadImgDialogInitialTab
    uiStore.uploadImgDialogInitialTab = null
  }
  else if (open && !uiStore.uploadImgDialogInitialTab) {
    activeName.value = `mp`
  }
})

async function changeImgHost() {
  toast.success(`图床已切换`)
}

async function changeCompression() {
  // reactive 会自动保存，不需要手动操作
}

function onTabScroll(e: WheelEvent) {
  if (e.deltaY !== 0) {
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    target.scrollLeft += e.deltaY
  }
}
</script>

<template>
  <Dialog v-model:open="uiStore.isShowUploadImgDialog">
    <DialogContent class="md:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" @pointer-down-outside="ev => ev.preventDefault()">
      <DialogHeader>
        <DialogTitle>图床设置</DialogTitle>
        <DialogDescription>
          对外只强调公众号素材库。配好后，复制到公众号时会自动把图片转成微信地址。其余图床收在「其他图床」。
        </DialogDescription>
      </DialogHeader>
      <p class="text-xs leading-5 text-amber-700 dark:text-amber-300">
        {{ secretRiskHint }}
      </p>
      <Tabs v-model="activeName" class="w-full md:w-full flex flex-col flex-1 overflow-hidden">
        <div class="flex w-full flex-wrap items-center gap-2 pb-2">
          <button
            type="button"
            class="rounded-md border px-3 py-1.5 text-xs md:text-sm"
            :class="activeName === 'mp'
              ? 'border-foreground bg-foreground text-background'
              : 'border-border text-muted-foreground hover:text-foreground'"
            @click="activeName = 'mp'"
          >
            公众号素材库
          </button>
          <button
            type="button"
            class="rounded-md border px-3 py-1.5 text-xs md:text-sm"
            :class="isOtherHostTab
              ? 'border-foreground bg-foreground text-background'
              : 'border-border text-muted-foreground hover:text-foreground'"
            @click="openOtherHosts"
          >
            其他图床
          </button>
        </div>
        <div v-if="isOtherHostTab" class="pb-2">
          <Select v-model="activeName">
            <SelectTrigger>
              <SelectValue placeholder="选择其他图床" />
            </SelectTrigger>
            <SelectContent class="max-h-64 md:max-h-96">
              <SelectItem value="general" label="通用设置">
                通用设置
              </SelectItem>
              <SelectItem
                v-for="item in otherHostOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              >
                {{ item.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <TabsList class="hidden" @wheel="onTabScroll">
          <TabsTrigger value="mp">
            公众号素材库
          </TabsTrigger>
          <TabsTrigger value="general">
            通用设置
          </TabsTrigger>
          <TabsTrigger
            v-for="item in otherHostOptions"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" class="flex-1 overflow-y-auto p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <Select v-model="imgHost" class="my-4" @update:model-value="changeImgHost">
            <SelectTrigger>
              <SelectValue placeholder="请选择图床" />
            </SelectTrigger>
            <SelectContent class="max-h-64 md:max-h-96">
              <SelectItem
                v-for="item in options"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              >
                {{ item.label }}
              </SelectItem>
            </SelectContent>
          </Select>

          <div class="space-y-3 my-4">
            <div class="flex items-center justify-between gap-4">
              <span class="text-sm">
                开启图片压缩
              </span>
              <Switch
                v-model:checked="useCompression"
                name="UseCompression"
                @update:checked="changeCompression"
              />
            </div>

            <div class="flex items-center justify-between gap-4">
              <span class="text-sm">
                粘贴图片时自动转存
              </span>
              <Switch
                v-model:checked="enableImageReupload"
                name="EnableImageReupload"
                @update:checked="toggleImageReupload"
              />
            </div>
            <p class="text-xs text-muted-foreground mt-1.5">
              粘贴 Markdown 图片链接时自动转存到配置的图床
            </p>
          </div>
        </TabsContent>

        <TabsContent value="github" class="flex-1 flex flex-col overflow-hidden">
          <Form :validation-schema="githubSchema" :initial-values="githubConfig" class="flex flex-col flex-1 overflow-hidden" @submit="githubSubmit">
            <div class="flex-1 overflow-y-auto p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <Field v-slot="{ field, errorMessage }" name="repo">
                <FormItem label="GitHub 仓库" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：github.com/yourname/notes"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="branch">
                <FormItem label="分支" :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：release，可不填，默认 master"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="accessToken">
                <FormItem label="Token" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    type="password"
                    placeholder="如：ghp_EXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMPLEE"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="useCDN" type="boolean">
                <FormItem label="CDN 加速" :error="errorMessage">
                  <Switch
                    :checked="field.value"
                    :name="field.name"
                    @update:checked="field.onChange"
                    @blur="field.onBlur"
                  />
                </FormItem>
              </Field>

              <FormItem>
                <Button
                  variant="link"
                  class="p-0 h-auto text-left whitespace-normal"
                  as="a"
                  href="https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token"
                  target="_blank"
                >
                  如何获取 GitHub Token？
                </Button>
              </FormItem>
            </div>

            <DialogFooter class="p-1">
              <Button type="submit">
                保存配置
              </Button>
            </DialogFooter>
          </Form>
        </TabsContent>

        <TabsContent value="aliOSS" class="flex-1 flex flex-col overflow-hidden">
          <Form :validation-schema="aliOSSSchema" :initial-values="aliOSSConfig" class="flex flex-col flex-1 overflow-hidden" @submit="aliOSSSubmit">
            <div class="flex-1 overflow-y-auto p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <Field v-slot="{ field, errorMessage }" name="accessKeyId">
                <FormItem label="AccessKey ID" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：LTAIEXAMPLEEXAMPLEEXAMPLEE"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="accessKeySecret">
                <FormItem label="AccessKey Secret" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    type="password"
                    placeholder="如：EXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMP"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="bucket">
                <FormItem label="Bucket" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：my-bucket"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="region">
                <FormItem label="Bucket 所在区域" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：oss-cn-shenzhen"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="useSSL" type="boolean">
                <FormItem label="UseSSL" required :error="errorMessage">
                  <Switch
                    :checked="field.value"
                    :name="field.name"
                    @update:checked="field.onChange"
                    @blur="field.onBlur"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="cdnHost">
                <FormItem label="自定义 CDN 域名" :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：https://cdn.example.com，可不填"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="path">
                <FormItem label="存储路径" :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：img，可不填，默认为根目录"
                  />
                </FormItem>
              </Field>

              <FormItem>
                <Button
                  variant="link"
                  class="p-0 h-auto text-left whitespace-normal"
                  as="a"
                  href="https://help.aliyun.com/document_detail/31883.html"
                  target="_blank"
                >
                  如何使用阿里云 OSS？
                </Button>
              </FormItem>
            </div>

            <DialogFooter class="p-1">
              <Button type="submit">
                保存配置
              </Button>
            </DialogFooter>
          </Form>
        </TabsContent>

        <TabsContent value="txCOS" class="flex-1 flex flex-col overflow-hidden">
          <Form :validation-schema="txCOSSchema" :initial-values="txCOSConfig" class="flex flex-col flex-1 overflow-hidden" @submit="txCOSSubmit">
            <div class="flex-1 overflow-y-auto p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <Field v-slot="{ field, errorMessage }" name="secretId">
                <FormItem label="SecretId" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：AKIDEXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMP"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="secretKey">
                <FormItem label="SecretKey" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    type="password"
                    placeholder="如：EXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAM"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="bucket">
                <FormItem label="Bucket" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：my-bucket-example"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="region">
                <FormItem label="Bucket 所在区域" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：ap-guangzhou"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="cdnHost">
                <FormItem label="自定义 CDN 域名" :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：https://cdn.example.com，可不填"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="path">
                <FormItem label="存储路径" :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：img，可不填，默认根目录"
                  />
                </FormItem>
              </Field>

              <FormItem>
                <Button
                  variant="link"
                  class="p-0 h-auto text-left whitespace-normal"
                  as="a"
                  href="https://cloud.tencent.com/document/product/436/38484"
                  target="_blank"
                >
                  如何使用腾讯云 COS？
                </Button>
              </FormItem>
            </div>

            <DialogFooter class="p-1">
              <Button type="submit">
                保存配置
              </Button>
            </DialogFooter>
          </Form>
        </TabsContent>

        <TabsContent value="qiniu" class="flex-1 flex flex-col overflow-hidden">
          <Form :validation-schema="qiniuSchema" :initial-values="qiniuConfig" class="flex flex-col flex-1 overflow-hidden" @submit="qiniuSubmit">
            <div class="flex-1 overflow-y-auto p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <Field v-slot="{ field, errorMessage }" name="accessKey">
                <FormItem label="AccessKey" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：EXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAM"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="secretKey">
                <FormItem label="SecretKey" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    type="password"
                    placeholder="如：EXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMP"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="bucket">
                <FormItem label="Bucket" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：my-images"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="domain">
                <FormItem label="Bucket 对应域名" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：https://images.example.com"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="region">
                <FormItem label="存储区域" :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：z2，可不填"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="path">
                <FormItem label="存储路径" :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：img，可不填，默认为根目录"
                  />
                </FormItem>
              </Field>

              <FormItem>
                <Button
                  variant="link"
                  class="p-0 h-auto text-left whitespace-normal"
                  as="a"
                  href="https://developer.qiniu.com/kodo"
                  target="_blank"
                >
                  如何使用七牛云 Kodo？
                </Button>
              </FormItem>
            </div>

            <DialogFooter class="p-1">
              <Button type="submit">
                保存配置
              </Button>
            </DialogFooter>
          </Form>
        </TabsContent>

        <TabsContent value="minio" class="flex-1 flex flex-col overflow-hidden">
          <Form :validation-schema="minioOSSSchema" :initial-values="minioOSSConfig" class="flex flex-col flex-1 overflow-hidden" @submit="minioOSSSubmit">
            <div class="flex-1 overflow-y-auto p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <Field v-slot="{ field, errorMessage }" name="endpoint">
                <FormItem label="Endpoint" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：play.min.io"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="port">
                <FormItem label="Port" :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    type="number"
                    placeholder="如：9000，可不填，http 默认为 80，https 默认为 443"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="useSSL" type="boolean">
                <FormItem label="UseSSL" required :error="errorMessage">
                  <Switch
                    :checked="field.value"
                    :name="field.name"
                    @update:checked="field.onChange"
                    @blur="field.onBlur"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="bucket">
                <FormItem label="Bucket" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：my-bucket"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="accessKey">
                <FormItem label="AccessKey" required :error="errorMessage">
                  <Input v-bind="field" v-model="field.value" placeholder="如：zhangsan" />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="secretKey">
                <FormItem label="SecretKey" required :error="errorMessage">
                  <Input v-bind="field" v-model="field.value" placeholder="如：asdasdasd" />
                </FormItem>
              </Field>

              <FormItem>
                <Button
                  variant="link"
                  class="p-0 h-auto text-left whitespace-normal"
                  as="a"
                  href="http://docs.minio.org.cn/docs/master/minio-client-complete-guide"
                  target="_blank"
                >
                  如何使用 MinIO？
                </Button>
              </FormItem>
            </div>

            <DialogFooter class="p-1">
              <Button type="submit">
                保存配置
              </Button>
            </DialogFooter>
          </Form>
        </TabsContent>

        <TabsContent value="s3" class="flex-1 flex flex-col overflow-hidden">
          <Form :validation-schema="s3Schema" :initial-values="s3Config" class="flex flex-col flex-1 overflow-hidden" @submit="s3Submit">
            <div class="flex-1 overflow-y-auto p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <Field v-slot="{ field, errorMessage }" name="endpoint">
                <FormItem label="Endpoint" :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：s3.amazonaws.com，可不填"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="region">
                <FormItem label="Region" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：us-east-1"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="bucket">
                <FormItem label="Bucket" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：bucket-name"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="accessKeyId">
                <FormItem label="AccessKey ID" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：AKIAIOSFODNN7EXAMPLE"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="accessKeySecret">
                <FormItem label="AccessKey Secret" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    type="password"
                    placeholder="如：wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="path">
                <FormItem label="存储路径" :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：img，可不填，默认根目录"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="cdnHost">
                <FormItem label="自定义域名" :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：https://cdn.example.com"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="pathStyle" type="boolean">
                <FormItem label="Force Path Style" :error="errorMessage">
                  <Switch
                    :checked="field.value"
                    :name="field.name"
                    @update:checked="field.onChange"
                    @blur="field.onBlur"
                  />
                </FormItem>
              </Field>
            </div>

            <DialogFooter class="p-1">
              <Button type="submit">
                保存配置
              </Button>
            </DialogFooter>
          </Form>
        </TabsContent>

        <TabsContent value="mp" class="flex-1 flex flex-col overflow-hidden">
          <Form :validation-schema="mpSchema" :initial-values="mpConfig" class="flex flex-col flex-1 overflow-hidden" @submit="mpSubmit">
            <div class="flex-1 overflow-y-auto p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <p v-if="isDesktopApp" class="mb-3 text-xs leading-5 text-muted-foreground">
                桌面版由本机直接转发微信接口，不用另开代理。下面的资质仍要满足，不是填完密钥就能转存。
              </p>
              <p class="mb-3 text-xs leading-5 text-amber-800 dark:text-amber-200">
                {{ mpPrerequisiteHint }}
              </p>
              <p class="mb-3 text-xs leading-5 text-amber-700 dark:text-amber-300">
                {{ secretRiskHint }}
              </p>
              <p v-if="isProxyRequired" class="mb-3 text-xs leading-5 text-muted-foreground">
                官方代理尚未就绪，不能把 api.mobieditor.cn 当成默认能用。网页版必须填写已通过 /health 检查的代理地址。{{ isDevRuntime ? '本地开发可填 http://127.0.0.1:8788。' : '' }}
              </p>

              <div v-if="isProxyRequired" class="mb-3">
                <Button
                  type="button"
                  variant="link"
                  class="h-auto p-0 text-xs"
                  @click="showCustomMpProxy = !showCustomMpProxy"
                >
                  {{ showCustomMpProxy ? '收起代理地址' : '填写代理地址' }}
                </Button>
              </div>

              <Field
                v-if="isProxyRequired && showCustomMpProxy"
                v-slot="{ field, errorMessage }"
                name="proxyOrigin"
              >
                <FormItem label="公众号代理地址" :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：http://127.0.0.1:8788"
                  />
                  <p class="mt-2 text-xs leading-5 text-muted-foreground">
                    不能留空当官方默认。保存前会检查该地址的 /health。
                  </p>
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="appID">
                <FormItem label="appID" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：wx6e1234567890efa3"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="appsecret">
                <FormItem label="appsecret" required :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：d9f1abcdef01234567890abcdef82397"
                  />
                </FormItem>
              </Field>

              <FormItem>
                <div class="flex flex-col items-start">
                  <Button
                    variant="link"
                    class="p-0 h-auto text-left whitespace-normal"
                    as="a"
                    href="https://developers.weixin.qq.com/doc/offiaccount/Getting_Started/Getting_Started_Guide.html"
                    target="_blank"
                  >
                    如何开启公众号开发者模式并获取应用账号密钥？
                  </Button>
                  <Button
                    variant="link"
                    class="p-0 h-auto text-left whitespace-normal"
                    as="a"
                    href="https://developers.weixin.qq.com/doc/oplatform/developers/basic_func/ip_whitelist.html"
                    target="_blank"
                  >
                    官方说明：API IP 白名单与 40164
                  </Button>
                </div>
              </FormItem>
            </div>

            <DialogFooter class="p-1">
              <Button type="submit">
                保存配置
              </Button>
            </DialogFooter>
          </Form>
        </TabsContent>

        <TabsContent value="r2" class="flex-1 flex flex-col overflow-hidden">
          <Form :validation-schema="r2Schema" :initial-values="r2Config" class="flex flex-col flex-1 overflow-hidden" @submit="r2Submit">
            <div class="flex-1 overflow-y-auto p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <Field v-slot="{ field, errorMessage }" name="accountId">
                <FormItem label="AccountId" required :error="errorMessage">
                  <Input v-bind="field" v-model="field.value" placeholder="如: 0030f123e55a57546f4c281c564e560" class="w-full min-w-0 md:min-w-[350px]" />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="accessKey">
                <FormItem label="AccessKey" required :error="errorMessage">
                  <Input v-bind="field" v-model="field.value" placeholder="如: 358090b3a12824a6b0787gae7ad0fc72" />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="secretKey">
                <FormItem label="SecretKey" required :error="errorMessage">
                  <Input v-bind="field" v-model="field.value" type="password" placeholder="如: c1c4dbcb0b6b785ac6633422a06dff3dac055fe74fe40xj1b5c5fcf1bf128010" />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="bucket">
                <FormItem label="Bucket" required :error="errorMessage">
                  <Input v-bind="field" v-model="field.value" placeholder="如：md" />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="domain">
                <FormItem label="域名" required :error="errorMessage">
                  <Input v-bind="field" v-model="field.value" placeholder="如：https://oss.example.com" />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="path">
                <FormItem label="存储路径" :error="errorMessage">
                  <Input v-bind="field" v-model="field.value" placeholder="如：img，可不填，默认为根目录" />
                </FormItem>
              </Field>

              <FormItem>
                <div class="flex flex-col items-start">
                  <Button
                    variant="link"
                    class="p-0 h-auto text-left whitespace-normal"
                    as="a"
                    href="https://developers.cloudflare.com/r2/api/s3/api/"
                    target="_blank"
                  >
                    如何使用 S3 API 操作 Cloudflare R2？
                  </Button>
                  <Button
                    variant="link"
                    class="p-0 h-auto text-left whitespace-normal"
                    as="a"
                    href="https://developers.cloudflare.com/r2/buckets/cors/"
                    target="_blank"
                  >
                    如何设置跨域(CORS)？
                  </Button>
                </div>
              </FormItem>
            </div>

            <DialogFooter class="p-1">
              <Button type="submit">
                保存配置
              </Button>
            </DialogFooter>
          </Form>
        </TabsContent>

        <TabsContent value="upyun" class="flex-1 flex flex-col overflow-hidden">
          <Form :validation-schema="upyunSchema" :initial-values="upyunConfig" class="flex flex-col flex-1 overflow-hidden" @submit="upyunSubmit">
            <div class="flex-1 overflow-y-auto p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <Field v-slot="{ field, errorMessage }" name="bucket">
                <FormItem label="Bucket" required :error="errorMessage">
                  <Input v-bind="field" v-model="field.value" placeholder="如: md" class="w-full min-w-0 md:min-w-[350px]" />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="operator">
                <FormItem label="操作员" required :error="errorMessage">
                  <Input v-bind="field" v-model="field.value" placeholder="如: operator" />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="password">
                <FormItem label="操作员密码" required :error="errorMessage">
                  <Input v-bind="field" v-model="field.value" type="password" placeholder="如: c1c4dbcb0b6b785ac6633422a06dff3dac055fe74fe40xj1b5c5fcf1bf128010" />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="domain">
                <FormItem label="域名" required :error="errorMessage">
                  <Input v-bind="field" v-model="field.value" placeholder="如：http://xxx.test.upcdn.net" />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="path">
                <FormItem label="存储路径" :error="errorMessage">
                  <Input v-bind="field" v-model="field.value" placeholder="如：img，可不填，默认为根目录" />
                </FormItem>
              </Field>

              <FormItem>
                <Button
                  variant="link"
                  class="p-0 h-auto text-left whitespace-normal"
                  as="a"
                  href="https://help.upyun.com/"
                  target="_blank"
                >
                  如何使用 又拍云？
                </Button>
              </FormItem>
            </div>

            <DialogFooter class="p-1">
              <Button type="submit">
                保存配置
              </Button>
            </DialogFooter>
          </Form>
        </TabsContent>

        <TabsContent value="telegram" class="flex-1 flex flex-col overflow-hidden">
          <Form :validation-schema="telegramSchema" :initial-values="telegramConfig" class="flex flex-col flex-1 overflow-hidden" @submit="telegramSubmit">
            <div class="flex-1 overflow-y-auto p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <Field v-slot="{ field, errorMessage }" name="token">
                <FormItem label="Bot Token" required :error="errorMessage">
                  <Input v-bind="field" v-model="field.value" placeholder="如：123456789:ABCdefGHIjkl-MNOPqrSTUvwxYZ" />
                </FormItem>
              </Field>
              <Field v-slot="{ field, errorMessage }" name="chatId">
                <FormItem label="Chat ID" required :error="errorMessage">
                  <Input v-bind="field" v-model="field.value" placeholder="如：-1001234567890" />
                </FormItem>
              </Field>
            </div>

            <DialogFooter class="p-1">
              <Button type="submit">
                保存配置
              </Button>
            </DialogFooter>
          </Form>
        </TabsContent>

        <TabsContent value="cloudinary" class="flex-1 flex flex-col overflow-hidden">
          <Form
            :validation-schema="cloudinarySchema"
            :initial-values="cloudinaryConfig"
            class="flex flex-col flex-1 overflow-hidden"
            @submit="cloudinarySubmit"
          >
            <div class="flex-1 overflow-y-auto p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <Field v-slot="{ field, errorMessage }" name="cloudName">
                <FormItem label="Cloud Name" required :error="errorMessage">
                  <Input v-bind="field" v-model="field.value" placeholder="如：demo" />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="apiKey">
                <FormItem label="API Key" required :error="errorMessage">
                  <Input v-bind="field" v-model="field.value" placeholder="如：1234567890" />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="apiSecret">
                <FormItem label="API Secret" :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    type="password"
                    placeholder="用于签名上传，可不填"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="uploadPreset">
                <FormItem label="Upload Preset" :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="unsigned 时必填，signed 时可不填"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="folder">
                <FormItem label="Folder" :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：blog/image，可不填"
                  />
                </FormItem>
              </Field>

              <Field v-slot="{ field, errorMessage }" name="domain">
                <FormItem label="自定义域名 / CDN" :error="errorMessage">
                  <Input
                    v-bind="field"
                    v-model="field.value"
                    placeholder="如：https://cdn.example.com，可不填"
                  />
                </FormItem>
              </Field>

              <FormItem>
                <Button
                  variant="link"
                  class="p-0 h-auto text-left whitespace-normal"
                  as="a"
                  href="https://cloudinary.com/documentation/upload_images"
                  target="_blank"
                >
                  Cloudinary 使用文档
                </Button>
              </FormItem>
            </div>

            <DialogFooter class="p-1">
              <Button type="submit">
                保存配置
              </Button>
            </DialogFooter>
          </Form>
        </TabsContent>

        <TabsContent value="formCustom" class="flex-1 flex flex-col overflow-hidden">
          <div class="space-y-3 p-1">
            <p class="text-xs leading-5 text-amber-700 dark:text-amber-300">
              {{ secretRiskHint }}自定义脚本默认关闭，确认后才会在本机执行。
            </p>
            <div class="flex items-center justify-between gap-4">
              <span class="text-sm">
                我确认允许执行自定义上传脚本
              </span>
              <Switch
                v-model:checked="formCustomScriptConfirmed"
                name="FormCustomScriptConfirmed"
              />
            </div>
          </div>
          <CustomUploadForm />
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>
</template>
