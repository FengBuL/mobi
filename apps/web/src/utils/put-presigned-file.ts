export async function putPresignedFile(url: string, file: File) {
  const response = await window.fetch(url, {
    method: `PUT`,
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  })
  if (!response.ok) {
    throw new Error(`上传失败：${response.status}`)
  }
}
