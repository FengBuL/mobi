<script setup lang="ts">
import type { MenubarTriggerProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { MenubarTrigger, useForwardProps } from 'radix-vue'
import { cn } from '@/lib/utils'

const props = defineProps<MenubarTriggerProps & { class?: HTMLAttributes[`class`] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <MenubarTrigger
    v-bind="forwardedProps"
    :class="
      cn(
        // 打开时压一道墨线，而不是套一个灰色圆角块
        'relative flex cursor-default select-none items-center px-2.5 py-1 text-sm font-medium text-foreground/70 outline-hidden transition-colors after:absolute after:inset-x-2.5 after:-bottom-0.5 after:h-px after:bg-transparent hover:text-foreground focus:text-foreground data-[state=open]:text-foreground data-[state=open]:after:bg-foreground',
        props.class,
      )
    "
  >
    <slot />
  </MenubarTrigger>
</template>
