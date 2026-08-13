/**
 * 代码块配色。highlight.js 自带 70 多套，绝大多数是给 IDE 用的，
 * 在公众号这种「浅底、手机屏、正文夹一段代码」的场景里差别小又难挑。
 * 这里只留 10 套：浅深各半，彼此拉得开，都在正文里实测过可读。
 *
 * 单独成文件是因为构建插件也要用同一份清单，只拷这几套 CSS 进产物，
 * 不然 70 多套要多带 280KB 死重量。
 */
export const codeBlockThemeIds = [
  // 浅色：正文是纸感底色时用这几套，代码块不会在页面上砸出一块黑
  `github`,
  `xcode`,
  `atom-one-light`,
  `stackoverflow-light`,
  `grayscale`,

  // 深色：需要代码块跳出来时用
  `github-dark`,
  `atom-one-dark`,
  `monokai`,
  `nord`,
  `night-owl`,
] as const

/** 存量用户选的主题被删掉时回落到这套，而不是让代码块变成没有配色的白板 */
export const FALLBACK_CODE_BLOCK_THEME = `github`
