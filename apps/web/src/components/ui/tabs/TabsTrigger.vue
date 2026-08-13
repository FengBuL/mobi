<script setup lang="ts">
import type { TabsTriggerProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { TabsTrigger, useForwardProps } from 'radix-vue'
import { cn } from '@/lib/utils'

const props = defineProps<TabsTriggerProps & { class?: HTMLAttributes[`class`] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <TabsTrigger
    v-bind="forwardedProps"
    :class="cn(
      // 选中态用一道墨线压在底部，与 TabsList 的分隔线重合
      'relative -mb-px inline-flex items-center justify-center whitespace-nowrap border-b-2 border-transparent px-0.5 pb-2 pt-1 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:text-foreground/75 data-[state=active]:border-foreground data-[state=active]:text-foreground',
      props.class,
    )"
  >
    <span class="truncate">
      <slot />
    </span>
  </TabsTrigger>
</template>
