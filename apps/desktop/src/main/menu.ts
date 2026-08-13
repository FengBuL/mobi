import type { MenuItemConstructorOptions } from 'electron'
import { app, Menu } from 'electron'
import { isDev } from './env'

/**
 * 页面顶部已经有一整套「文件 / 编辑 / 格式 / 插入 / 帮助」，那才是产品的主菜单。
 * 系统菜单栏不去重复它——两份菜单同步不上就是 bug 温床——只负责三件系统层面的事：
 * 让 macOS 显示正确的应用名和「关于 / 退出」，让复制粘贴的系统快捷键有归属，
 * 以及把「重新加载 / 开发者工具」这类调试项挡在正式版之外。
 */

function editMenu(): MenuItemConstructorOptions {
  const items: MenuItemConstructorOptions[] = [
    { role: `undo`, label: `撤销` },
    { role: `redo`, label: `重做` },
    { type: `separator` },
    { role: `cut`, label: `剪切` },
    { role: `copy`, label: `复制` },
    { role: `paste`, label: `粘贴` },
  ]

  if (process.platform === `darwin`) {
    items.push({ role: `pasteAndMatchStyle`, label: `粘贴为纯文本` })
  }

  items.push(
    { role: `delete`, label: `删除` },
    { type: `separator` },
    { role: `selectAll`, label: `全选` },
  )

  return { label: `编辑`, submenu: items }
}

function viewMenu(): MenuItemConstructorOptions {
  const items: MenuItemConstructorOptions[] = [
    { role: `resetZoom`, label: `实际大小` },
    { role: `zoomIn`, label: `放大` },
    { role: `zoomOut`, label: `缩小` },
    { type: `separator` },
    { role: `togglefullscreen`, label: `全屏` },
  ]

  if (isDev) {
    items.unshift(
      { role: `reload`, label: `重新加载` },
      { role: `forceReload`, label: `强制重新加载` },
      { role: `toggleDevTools`, label: `开发者工具` },
      { type: `separator` },
    )
  }

  return { label: `视图`, submenu: items }
}

function windowMenu(): MenuItemConstructorOptions {
  const items: MenuItemConstructorOptions[] = [
    { role: `minimize`, label: `最小化` },
    { role: `zoom`, label: `缩放` },
  ]

  if (process.platform === `darwin`) {
    items.push({ type: `separator` }, { role: `front`, label: `前置全部窗口` })
  }

  items.push({ type: `separator` }, { role: `close`, label: `关闭窗口` })

  return { label: `窗口`, submenu: items }
}

function buildTemplate(): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = []

  if (process.platform === `darwin`) {
    template.push({
      label: app.name,
      submenu: [
        { role: `about`, label: `关于墨笔` },
        { type: `separator` },
        { role: `services`, label: `服务` },
        { type: `separator` },
        { role: `hide`, label: `隐藏墨笔` },
        { role: `hideOthers`, label: `隐藏其他` },
        { role: `unhide`, label: `全部显示` },
        { type: `separator` },
        { role: `quit`, label: `退出墨笔` },
      ],
    })
  }
  else {
    template.push({
      label: `文件`,
      submenu: [
        { role: `close`, label: `关闭窗口` },
        { type: `separator` },
        { role: `quit`, label: `退出` },
      ],
    })
  }

  template.push(editMenu(), viewMenu(), windowMenu())

  if (process.platform !== `darwin`) {
    template.push({
      label: `帮助`,
      submenu: [{ role: `about`, label: `关于墨笔` }],
    })
  }

  return template
}

export function installApplicationMenu(): void {
  app.setAboutPanelOptions({
    applicationName: `墨笔`,
    applicationVersion: app.getVersion(),
    version: ``,
  })

  Menu.setApplicationMenu(Menu.buildFromTemplate(buildTemplate()))
}
