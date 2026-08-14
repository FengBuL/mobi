# 墨笔     <img width="40" height="40" alt="icon" src="https://github.com/user-attachments/assets/17a4be69-bb73-4c93-b2c4-29ce65fe59c9" />


写完就能贴进公众号的 Markdown 排版编辑器。

左边写 Markdown，右边就是公众号里的样子，排好版一键复制，粘到公众号后台不走样。

## 下载桌面版

到 [Releases](https://github.com/FengBuL/mobi/releases/latest) 下载对应系统的安装包：

| 系统 | 文件 |
| --- | --- |
| macOS（Apple 芯片） | `mobi-*-arm64.dmg` |
| macOS（Intel） | `mobi-*-x64.dmg` |
| Windows | `mobi-*-x64.exe` |
| Linux | `mobi-*-x86_64.AppImage` |

安装包暂未购买证书做签名公证，第一次打开系统会拦一下，之后不再提示：

- **macOS 15 及以上**：双击提示「无法验证开发者」后，打开「系统设置 → 隐私与安全性」，
  往下翻会看到刚才被拦下的墨笔，点「仍要打开」
- **macOS 14 及以下**：右键点图标选「打开」，在弹窗里再点一次「打开」
- **Windows**：SmartScreen 提示里点「更多信息 → 仍要运行」

## 或者直接用网页版

<https://fengbul.github.io/mobi/>

打开就能写，不用装东西。建议用 Chrome 或 Edge——本地文件夹功能只有 Chromium 系浏览器支持。

## 能做什么

- Markdown 编辑与实时预览，预览就是公众号里的最终效果
- 23 套主题，主题色、字体、字号、标题样式都能单独调
- 板块库：140 个预设版式，点预览里的元素就能原地换样式
- 图片排版工作台：单图、双图、三图、长图视窗等 32 个模板
- 代码块、表格、脚注、Mermaid、KaTeX、信息图
- 本地文章管理、文件夹同步、导入导出（MD / HTML / PDF / PNG）

## 公众号图床

要把带图片的内容稳定贴进公众号，需要配一次图床，让图片先转成公众号自己的地址
（否则微信转存外链图时容易把排版洗掉）。

桌面版：打开「插入 → 插入图片」，切到「公众号图床」页签，填 AppID 和 AppSecret 保存。

两个前置条件：

1. 在公众号后台「设置与开发 → 基本配置」里拿到 AppID / AppSecret
2. 把你当前的外网 IP 加进同页面的「IP 白名单」，否则接口会报错。
   家庭宽带 IP 变了之后需要重新添加

网页版因为浏览器跨域限制，还需要在本机跑一个代理，桌面版没有这个问题。

## 反馈

用着有问题或想要新功能，欢迎提 [Issue](https://github.com/FengBuL/mobi/issues)。
