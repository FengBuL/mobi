# 墨笔项目状态

核对日期：2026-08-14

## 当前基线

- 产品版本：`2.2.0`
- 当前公开版本：`2.2.0`
- Git 分支：`main`
- 当前发布基线：`v2.2.0`
- 私有源码：<https://github.com/FengBuL/mobi-src>
- 公开分发：<https://github.com/FengBuL/mobi>
- 网页版：<https://fengbul.github.io/mobi/>
- 当前公开 Release：<https://github.com/FengBuL/mobi/releases/tag/v2.2.0>
- 数据观测台：<https://mobi-telemetry.shovy-mobi.workers.dev/dashboard>

## 项目组成

```text
apps/web                    网页编辑器与桌面渲染层
apps/desktop                Electron 桌面外壳与打包
apps/mp-proxy               网页版公众号图片代理
packages/core               Markdown 渲染与主题核心
packages/shared             共享样式、配置、类型与工具
packages/config             TypeScript 配置
infra/telemetry-worker      匿名统计、D1 查询与观测台
docs                        产品设计和验收资料
scripts                     发布、诊断和验收工具
tests                       自动化测试
patches                     pnpm 依赖补丁
```

## 已知质量基线

- Vitest：以当前完整测试输出为准；
- TypeScript：网页端和桌面端类型检查；
- ESLint：0 error，存在既有 warning；
- CI：macOS、Windows、Linux 桌面构建；
- v2.2.0：桌面应用内选择性更新、`api.mobieditor.cn` 官方代理默认值、公众号图片比例实体化与移动端预览尺寸校准；
- v2.1.8 公开 Release：macOS、Windows、Linux 四个平台资产。

每次交接或发布前都要重新运行验证命令，本文记录不能代替当前测试结果。

## 仓库原则

- 完整源码只进入私有 `mobi-src`；
- 公共 `mobi` 只承载分发内容；
- 生产凭据不进入 Git；
- `node_modules`、构建目录和安装包均可重建，不纳入源码交接；
- 历史上游与许可证信息见 `THIRD_PARTY_NOTICES.md`。
