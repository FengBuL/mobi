import antfu from '@antfu/eslint-config'

export default antfu(
  {
    vue: true,
    typescript: true,
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      // 生成物
      'apps/web/auto-imports.d.ts',
      'apps/web/components.d.ts',
      // 主题 CSS 是资源不是源码
      'packages/shared/src/configs/theme-css/**',
      // 文档和示例正文里的代码块是摘抄的片段，不是可运行代码
      'docs/**',
      'apps/web/src/assets/example/**',
    ],
  },
  {
    rules: {
      // 仓库的约定是「值用反引号、类型用单引号」，没有哪条 quotes 规则能表达这个区分。
      // 强行统一会把类型注解改写成模板字面量类型，破坏可读性也打乱 vue 插件的静态分析。
      'style/quotes': 'off',
      // 板块和主题里大量拼接内联样式的 HTML 字符串，长度限制没有意义
      'style/max-len': 'off',
      // Node ESM 里 process / Buffer 用全局是常规写法，没必要逐个 import
      'node/prefer-global/process': 'off',
      'node/prefer-global/buffer': 'off',
      // 中文文案里夹全角空格是有意的排版
      'no-irregular-whitespace': ['error', { skipStrings: true, skipTemplates: true, skipComments: true }],
      // 重命名主题、存预设走的是原生 prompt，属于有意选择
      'no-alert': 'off',
      // 语法高亮定义里一行一条规则，拆开反而难读
      'style/max-statements-per-line': 'off',
      // 它建议的 Array.from({ length }).fill(x) 在 TS 下推断成 unknown[]，
      // 带 map 回调的写法才能拿到正确的元素类型
      'e18e/prefer-array-fill': 'off',
      // 下面几条留作提示：值得看，但不该拦住提交
      'no-console': 'warn',
      'regexp/no-unused-capturing-group': 'warn',
      'regexp/no-contradiction-with-assertion': 'warn',
      'regexp/no-super-linear-backtracking': 'warn',
    },
  },
  {
    // 验证脚本、代理和 Electron 主进程都是命令行程序，打印就是它们的输出方式
    files: [
      'scripts/**/*.mjs',
      'apps/mp-proxy/**/*.mjs',
      'apps/desktop/scripts/**/*.mjs',
      'apps/desktop/src/main/**/*.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
)
