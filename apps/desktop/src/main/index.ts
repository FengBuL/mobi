import { app, BrowserWindow } from 'electron'
import { installCrossOriginRelaxations } from './crossOrigin'
import { isDev } from './env'
import { registerWechatIpc } from './ipc'
import { installApplicationMenu } from './menu'
import { installPermissionHandlers } from './permissions'
import { handleAppProtocol, registerAppScheme } from './protocol'
import { initializeDesktopUpdates } from './updates'
import { createMainWindow, hardenWebContents } from './window'

app.setName(`墨笔`)

// 必须赶在 app ready 之前，ready 之后再注册协议特权是不生效的
registerAppScheme()

if (!app.requestSingleInstanceLock()) {
  app.quit()
}
else {
  app.on(`second-instance`, () => {
    const [existing] = BrowserWindow.getAllWindows()
    if (!existing) {
      return
    }
    if (existing.isMinimized()) {
      existing.restore()
    }
    existing.focus()
  })

  app.on(`web-contents-created`, (_event, contents) => {
    hardenWebContents(contents)
  })

  app.whenReady().then(() => {
    handleAppProtocol()
    installPermissionHandlers()
    installCrossOriginRelaxations()
    installApplicationMenu()
    registerWechatIpc()
    const mainWindow = createMainWindow()
    initializeDesktopUpdates(mainWindow)

    app.on(`activate`, () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow()
      }
    })
  }).catch((error) => {
    console.error(`[mobi] 启动失败`, error)
    app.quit()
  })

  app.on(`window-all-closed`, () => {
    if (process.platform !== `darwin`) {
      app.quit()
    }
  })

  if (isDev) {
    console.log(`[mobi] 开发模式启动`)
  }
}
