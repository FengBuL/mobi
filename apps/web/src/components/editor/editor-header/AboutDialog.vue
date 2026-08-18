<script setup lang="ts">
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([`close`])

function onUpdate(val: boolean) {
  if (!val) {
    emit(`close`)
  }
}

const appVersion = typeof __APP_VERSION__ !== `undefined` ? __APP_VERSION__ : `dev`

const links = [
  { label: `项目主页`, url: `https://github.com/FengBuL/mobi` },
  { label: `下载桌面版`, url: `https://github.com/FengBuL/mobi/releases/latest` },
]

function onRedirect(url: string) {
  window.open(url, `_blank`)
}
</script>

<template>
  <Dialog :open="props.visible" @update:open="onUpdate">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>关于墨笔</DialogTitle>
      </DialogHeader>
      <div class="space-y-3 py-2 text-center">
        <svg class="mx-auto" width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="15" fill="#B93A26" />
          <path d="M46 11C46 30.5 37 44 17.5 52.5L13.5 44.5C28 37 34.5 11Z" fill="#FBF7F0" />
        </svg>
        <h3 class="text-base font-semibold">
          墨笔
        </h3>
        <p class="text-sm text-muted-foreground">
          写完就能贴进公众号的 Markdown 排版编辑器
        </p>
        <p class="text-xs text-muted-foreground">
          v{{ appVersion }}
        </p>
        <p class="text-xs text-muted-foreground">
          匿名使用统计默认关闭，开关在「设置」。
        </p>
      </div>

      <DialogFooter class="sm:justify-evenly flex flex-wrap gap-2">
        <Button
          v-for="link in links"
          :key="link.url"
          variant="outline"
          @click="onRedirect(link.url)"
        >
          {{ link.label }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
