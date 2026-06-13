/**
 * Export a text file across web and native.
 *
 * Blob-URL downloads (`<a download>`) silently do nothing inside the Capacitor
 * WebView, so on native we write the file with @capacitor/filesystem and open
 * the share sheet with @capacitor/share (the user picks Drive / email / Files).
 * On web we keep the blob download.
 *
 * Dependencies are injected behind the FileExporter interface so the routing is
 * tested with an in-memory exporter - no mock framework.
 */

import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export interface FileExporter {
  isNative(): boolean
  writeAndShare(filename: string, data: string): Promise<void>
  browserDownload(filename: string, data: string, mimeType: string): void
}

export const defaultExporter: FileExporter = {
  isNative: () => Capacitor.isNativePlatform(),

  async writeAndShare(filename, data) {
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    await Share.share({ title: filename, url: uri })
  },

  browserDownload(filename, data, mimeType) {
    const blob = new Blob([data], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },
}

/**
 * Export a text file: native share sheet on device, blob download on web.
 */
export async function exportTextFile(
  filename: string,
  data: string,
  mimeType: string,
  exporter: FileExporter = defaultExporter
): Promise<void> {
  if (exporter.isNative()) {
    await exporter.writeAndShare(filename, data)
  } else {
    exporter.browserDownload(filename, data, mimeType)
  }
}
