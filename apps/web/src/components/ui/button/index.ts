import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Button } from './Button.vue'

/*
 * 按钮的语气：印刷品上的方框和细线，不是组件库出厂的圆角灰块。
 *
 * outline 只留一道 hairline，hover 时加深描边并轻微上墨，而不是整块铺灰——
 * 铺灰是 shadcn 的标志性手势，一眼就能认出来。朱砂只留给主按钮，全局唯一的高饱和。
 */
export const buttonVariants = cva(
  `inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-medium ring-offset-background transition-[background-color,border-color,color] duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50`,
  {
    variants: {
      variant: {
        default: `bg-primary text-primary-foreground hover:bg-primary/88`,
        destructive:
          `bg-destructive text-destructive-foreground hover:bg-destructive/88`,
        outline:
          `border border-border bg-transparent hover:border-foreground/35 hover:bg-foreground/[0.04]`,
        secondary:
          `bg-secondary text-secondary-foreground hover:bg-secondary/80`,
        ghost: `hover:bg-foreground/[0.05]`,
        link: `text-primary underline-offset-4 hover:underline`,
      },
      size: {
        default: `h-10 px-4 py-2`,
        xs: `h-7 rounded-sm px-2`,
        sm: `h-9 rounded-sm px-3`,
        lg: `h-11 rounded-sm px-8`,
        icon: `h-10 w-10`,
      },
    },
    defaultVariants: {
      variant: `default`,
      size: `default`,
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
