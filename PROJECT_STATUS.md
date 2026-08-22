# 墨笔项目状态

核对日期：2026-08-22（晚）

## 当前基线

- 产品版本：`2.3.1`
- 当前公开版本：`2.3.1`
- Git 分支：`product/next`
- 当前发布基线：`v2.3.1`
- 源码与分发：<https://github.com/FengBuL/mobi>
- 许可证：[GNU AGPL-3.0-or-later](./LICENSE)
- 网页版：<https://mobieditor.cn/>
- 桌面下载：<https://app.mobieditor.cn/>
- 当前公开 Release：<https://github.com/FengBuL/mobi/releases/tag/v2.3.1>
- 数据观测台：不在仓库里写死地址；自建见 `infra/telemetry-worker`

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
- CI：macOS、Windows 桌面构建；Linux 请用网页版；
- v2.2.0：桌面应用内选择性更新、`api.mobieditor.cn` 官方代理默认值、公众号图片比例实体化与移动端预览尺寸校准；
- v2.2.1：修复桌面主进程加载 `electron-updater` 时因 CommonJS 默认导入互操作错误导致的启动闪退；
- v2.3.1：官方域名入口；连续换方案时样式生效。
- 未发布（2026-08-22 晚）：P1 + 边角 + 查找/导出/确认/预览复制/编辑撤销/主题条/名片/Logo 已进工作区。390 关内容管理要回宽度。公众号图床 / 官方代理 / 板块自带色未动。Vitest 43 文件 / 610 通过。

每次交接或发布前都要重新运行验证命令，本文记录不能代替当前测试结果。

## 仓库原则

- 源码、Issue 和桌面 Release 都在公开仓 `FengBuL/mobi`；
- 项目许可证是 GNU AGPL-3.0-or-later；
- 生产凭据不进入 Git；
- `node_modules`、构建目录和安装包均可重建，不纳入源码交接；
- 历史上游与第三方许可证见 `THIRD_PARTY_NOTICES.md`。
