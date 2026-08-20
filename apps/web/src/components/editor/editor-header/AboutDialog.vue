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
const homepageUrl = `https://github.com/FengBuL/mobi`

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
      </div>

      <DialogFooter class="sm:justify-center">
        <Button variant="outline" @click="onRedirect(homepageUrl)">
          项目主页
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
