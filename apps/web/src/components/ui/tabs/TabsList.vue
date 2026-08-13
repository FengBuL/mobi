<script setup lang="ts">
import type { TabsListProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { TabsList } from 'radix-vue'
import { cn } from '@/lib/utils'

const props = defineProps<TabsListProps & { class?: HTMLAttributes[`class`] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})
</script>

<template>
  <TabsList
    v-bind="delegatedProps"
    :class="cn(
      // 页签靠一道底线分区，不靠灰胶囊。胶囊是组件库的通用手势，也白白吃掉一圈空间
      'inline-flex items-center justify-start gap-5 border-b border-[hsl(var(--rule))] text-muted-foreground',
      props.class,
    )"
  >
    <slot />
  </TabsList>
</template>
