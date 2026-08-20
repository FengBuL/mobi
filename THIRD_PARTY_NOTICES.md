# 第三方来源与许可证说明

墨笔本体以 [GNU AGPL-3.0-or-later](./LICENSE) 对外开源。本文件记录第三方来源和授权边界。

## doocs/md

- 项目：<https://github.com/doocs/md>
- 核对提交：`a122fd74e99ec32fc1987e46739f33dbe88e0739`
- 上游版权声明：`Copyright (C) 2025 Doocs <admin@doocs.org>`
- 许可证：WTFPL Version 2
- 许可证副本：`third_party/licenses/doocs-md-WTFPL.txt`

WTFPL 允许复制、修改和再许可。从 `doocs/md` 演进而来的代码可以包含在 AGPL 项目中；墨笔自身新增代码与完整项目按 GNU AGPL-3.0-or-later 授权。

## npm 与其他依赖

直接和传递依赖由 `package.json`、各 workspace 的 `package.json` 和 `pnpm-lock.yaml` 锁定。每个依赖继续受其自身许可证约束。

对外分发桌面安装包或网页产物前，建议生成 SBOM 和第三方许可证汇总，并核对新增依赖是否与 AGPL-3.0-or-later 兼容。
