# 板块拼接系统

## 1. 目标与边界

板块是插入 Markdown 的原始 HTML。每个板块自带配色和全部内联样式，不读取主题变量。系统负责预设发现、表单生成、插入、回填和公众号转换；每个类别只负责本类别的数据、渲染与反解。

固定类别为：`heading`、`quote`、`list`、`card`、`data`、`interactive`、`divider`、`image`。图片类沿用 `image-layouts.ts` 和 `ImageLayoutWorkspace.vue`，不迁移其内部状态模型。

## 2. 目录

```text
apps/web/src/utils/blocks/
├── types.ts
├── helpers.ts
├── registry.ts
└── categories/
    ├── heading.ts
    ├── quote.ts
    ├── list.ts
    └── ...
```

`registry.ts` 使用 `import.meta.glob('./categories/*.ts', { eager: true })` 自动发现类别文件。新增类别不修改中央索引。

## 3. 数据模型

```ts
type BlockFieldType = 'text' | 'textarea' | 'url' | 'number' | 'switch'
type BlockState = Record<string, string | number | boolean>

interface BlockFieldSchema {
  key: string
  label: string
  type: BlockFieldType
  required?: boolean
  placeholder?: string
  defaultValue: string | number | boolean
  min?: number
  max?: number
  step?: number
}

interface BlockPalette {
  primary: string
  secondary: string
  ink: string
  muted: string
  surface: string
  border: string
}

interface BlockPreset {
  id: string
  category: Exclude<BlockCategoryId, 'image'>
  name: string
  description: string
  cue: string
  fields: BlockFieldSchema[]
  palette: BlockPalette
  thumbnail: {
    background: string
    foreground: string
    accent: string
  }
}
```

字段 schema 同时驱动默认状态和统一表单。类别可让不同预设拥有不同字段，例如卡片预设可声明 `title`、`body`、`imageUrl`、`linkUrl` 和 `showBadge`。

## 4. 类别接口

每个 `categories/*.ts` 默认导出一个 `BlockCategoryDefinition`：

```ts
interface BlockCategoryDefinition {
  id: Exclude<BlockCategoryId, 'image'>
  name: string
  description: string
  presets: BlockPreset[]
  createDefaultState(preset: BlockPreset): BlockState
  build(
    preset: BlockPreset,
    state: BlockState,
    context?: { mode: 'editor' | 'preview' },
  ): string
  parse(raw: string): {
    category: Exclude<BlockCategoryId, 'image'>
    presetId: string
    state: BlockState
    title: string
  } | null
  toWeChat(
    preset: BlockPreset,
    state: BlockState,
    context?: { primaryColor?: string },
  ): string
}
```

### build 契约

- 返回一个且仅一个根 `<section class="md-block ...">`。
- 所有视觉样式写在 `style`，不能依赖 class 选择器。
- 用户内容必须转义；多行文本换行为 `<br/>`。
- 可回填字段所在元素必须写 `data-block-field` 和 `data-block-value`。
- 不得输出 `position`、`display:grid`、`gap`、`aspect-ratio`、逻辑属性、动画或 `background-clip`。

### parse 契约

- 只解析本类别的根节点。
- 先从 `data-block-preset` 找预设，再读取 `data-block-field`。
- 未找到预设、结构损坏或类别不匹配时返回 `null`，不得猜测成其他预设。
- 返回的 state 必须包含 schema 中每个字段；缺失字段回退到 `defaultValue`。

### toWeChat 契约

- 返回完整公众号可粘贴结构，不返回只供预览使用的 class。
- 输出仍须保留预设自己的配色，不能改成主题主色。
- 必须使用物理属性和内联样式。
- 如果编辑结构使用了高风险布局，必须在这里改写为稳定结构，不能原样透传。

## 5. HTML 结构规范

```html
<section
  class="md-block md-block--heading"
  data-block-category="heading"
  data-block-preset="heading-signal-banner"
  data-block-version="1"
  style="margin:24px 0;..."
>
  <div style="...">
    <p
      data-block-field="title"
      data-block-value="章节标题"
      style="..."
    >章节标题</p>
  </div>
</section>
```

根节点内不要再嵌套 `<section>`。当前正文扫描器以根 `</section>` 为边界；内部容器使用 `div`、`p`、`span`、`a`、`img`。

### 命名

- 类别 ID：单数小写英文。
- 预设 ID：`<category>-<semantic-name>`，全局唯一，如 `heading-swiss-index`。
- 根 class：`md-block md-block--<category>`。
- 字段 key：语义英文，不带类别前缀，如 `title`、`body`、`imageUrl`。
- 版本：新建均为 `data-block-version="1"`。结构发生不兼容变化时升级并在 parse 中兼容旧版。

## 6. 注册与并行安全

后续 agent 每人只新增一个唯一文件：

```text
categories/quote.ts
categories/list.ts
categories/card.ts
categories/data.ts
categories/interactive.ts
categories/divider.ts
```

Vite 会自动汇总，不需要修改 `registry.ts`、数组索引或公共导出。因此六个 agent 的主要提交没有同文件冲突。

仍可能冲突的共享点只有统一面板。避免方法：

1. 类别文件先独立完成并通过接口验证。
2. 面板读取 registry 自动生成类别和预设，不为每类添加硬编码 import。
3. 类别专属复杂表单另建 `<Category>BlockFields.vue`，不要在统一面板堆分支。
4. 若需要类别专属字段组件，类别定义后续可统一扩展一次 `editorComponent`，各 agent 不同时修改公共类型。

禁止各类别自行改 `processClipboardContent`。复制链路只调用一次 `convertBlocksForWeChat()`，由 registry 路由到类别的 `toWeChat`。

## 7. 统一面板

板块库按八个类别横向分区：

- 标题显示 20 种预设和通用字段表单。
- 图片直接挂载现有 `ImageLayoutWorkspace` 工作流，不重写其选图、图床和回填逻辑。
- 尚未实现的类别显示接入占位。
- 桌面端沿用编辑器第二栏；移动端沿用原图片排版弹窗，但内容改为同一个板块库工作区。

回填通过扫描正文中的 `section.md-block` 完成。用户在“正文中的板块”列表点击编辑后，面板载入 preset 和 state；保存时按原 `from/to` 范围覆盖。图片类继续使用 `parseMediaLayoutBlocks()` 和它自己的编辑入口。

## 8. 复制链路

`processClipboardContent()` 在媒体布局转换后调用：

```ts
convertBlocksForWeChat(clipboardDiv)
```

转换器匹配 `section.md-block`，调用类别 `parse`，按 `presetId` 找预设，再调用 `toWeChat` 替换原节点。公共复制文件不包含任何类别特例。

## 9. 新增一个类别

1. 在 `types.ts` 已有的固定类别中确认 ID。
2. 新建 `categories/<category>.ts`，默认导出类别定义。
3. 设计至少 20 个全局唯一预设 ID。
4. 为每个预设声明 fields、palette 和 thumbnail。
5. 实现并验证 `createDefaultState`、`build`、`parse`、`toWeChat`。
6. 验证 `parse(build(preset, state))` 可恢复字段。
7. 验证 `toWeChat` 不含禁用属性和 `md-block` 预览 class。
8. 在真实板块库面板检查缩略图、输入、插入和覆盖编辑。
9. 扩展板块复制检查脚本覆盖本类别全部预设。
10. 运行 `pnpm type-check` 和 `pnpm build:web`。

不需要修改 registry，不需要修改复制核心，不需要建立第二套状态存储。

## 10. 最容易出错的地方

- 把主题变量写进板块。板块必须自带具体色值。
- 只实现 build，没有实现可逆的字段标记。
- 在根节点里嵌套 `<section>`，导致正文扫描提前结束。
- 缩略图只画通用占位，无法辨认真实版式。
- toWeChat 直接返回编辑结构，却遗漏微信不支持的布局属性。
- 在每个类别里各写一套正文查找与替换。
- 为注册新类别修改中央数组，制造并行合并冲突。
- 使用未经转义的用户文本拼 HTML。
