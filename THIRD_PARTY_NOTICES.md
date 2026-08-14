# 第三方来源与许可证说明

墨笔包含第三方依赖，也包含从早期 `doocs/md` 项目演进而来的代码。保留本文件用于记录来源和授权边界。

## doocs/md

- 项目：<https://github.com/doocs/md>
- 核对提交：`a122fd74e99ec32fc1987e46739f33dbe88e0739`
- 上游版权声明：`Copyright (C) 2025 Doocs <admin@doocs.org>`
- 许可证：WTFPL Version 2
- 许可证副本：`third_party/licenses/doocs-md-WTFPL.txt`

WTFPL 允许复制、修改和分发。该授权不会把墨笔自身新增代码自动置于 WTFPL，也不表示墨笔完整项目对外开源。

## npm 与其他依赖

直接和传递依赖由 `package.json`、各 workspace 的 `package.json` 和 `pnpm-lock.yaml` 锁定。每个依赖继续受其自身许可证约束。

对外分发桌面安装包或网页产物前，建议生成 SBOM 和第三方许可证汇总，并核对新增依赖是否兼容闭源分发。
