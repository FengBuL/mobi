<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: number
  min: number
  max: number
  step: number
  suffix?: string
  muted?: boolean
}>(), {
  suffix: ``,
  muted: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: number): void
}>()

const digits = computed(() => (props.step < 1 ? 2 : 0))

const display = computed(() => {
  const text = Number(props.modelValue).toFixed(digits.value)
  return text.includes(`.`) ? text.replace(/\.?0+$/, ``) : text
})

function handleInput(event: Event) {
  emit(`update:modelValue`, Number((event.target as HTMLInputElement).value))
}

function nudge(direction: number) {
  const next = Number((Number(props.modelValue) + direction * props.step).toFixed(4))
  emit(`update:modelValue`, Math.min(Math.max(next, props.min), props.max))
}
</script>

<template>
  <div class="flex items-center gap-2">
    <input
      type="range"
      class="theme-range h-1.5 min-w-0 flex-1 cursor-pointer accent-primary"
      :class="{ 'opacity-60': muted }"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      @input="handleInput"
    >
    <div class="flex shrink-0 items-center overflow-hidden rounded-md border bg-background">
      <button
        type="button"
        class="h-6 w-5 text-xs leading-none text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        @click="nudge(-1)"
      >
        −
      </button>
      <span class="w-12 text-center text-[11px] tabular-nums" :class="muted ? 'text-muted-foreground' : 'text-foreground'">
        {{ display }}{{ suffix }}
      </span>
      <button
        type="button"
        class="h-6 w-5 text-xs leading-none text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        @click="nudge(1)"
      >
        +
      </button>
    </div>
  </div>
</template>

<style scoped>
.theme-range {
  appearance: none;
  border-radius: 999px;
  background: hsl(var(--muted));
}

.theme-range::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border: 2px solid hsl(var(--background));
  border-radius: 999px;
  background: hsl(var(--primary));
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.25);
}

.theme-range::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 2px solid hsl(var(--background));
  border-radius: 999px;
  background: hsl(var(--primary));
}
</style>
