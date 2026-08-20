/** 网页版把人送到桌面安装包页。桌面壳里不要再露出这条入口。 */
export const DESKTOP_DOWNLOAD_URL = `https://app.mobieditor.cn`

export function openDesktopDownload() {
  window.open(DESKTOP_DOWNLOAD_URL, `_blank`)
}
