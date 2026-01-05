/**
 * 文件图标工具函数
 * 根据文件名和MIME类型返回对应的图标SVG路径
 */

export interface FileIconInfo {
  color: string // 图标颜色
  paths: string[] // SVG path数组
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

/**
 * 根据文件名和MIME类型获取图标信息
 */
export function getFileIcon(filename: string, mimeType: string): FileIconInfo {
  const ext = getFileExtension(filename)
  const mime = mimeType.toLowerCase()

  // 文件夹
  if (mime === 'folder') {
    return {
      color: '#FFB84D',
      paths: ['M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z']
    }
  }

  // 图片文件
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext)) {
    return {
      color: '#4CAF50',
      paths: ['M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z']
    }
  }

  // 视频文件
  if (mime.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v'].includes(ext)) {
    return {
      color: '#E91E63',
      paths: ['M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z']
    }
  }

  // 音频文件
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'].includes(ext)) {
    return {
      color: '#9C27B0',
      paths: ['M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3']
    }
  }

  // PDF文件
  if (mime === 'application/pdf' || ext === 'pdf') {
    return {
      color: '#F44336',
      paths: ['M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', 'M9 12h6m-6 4h6']
    }
  }

  // Word文档
  if (mime.includes('wordprocessingml') || ['doc', 'docx'].includes(ext)) {
    return {
      color: '#2196F3',
      paths: ['M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z']
    }
  }

  // Excel表格
  if (mime.includes('spreadsheetml') || ['xls', 'xlsx', 'csv'].includes(ext)) {
    return {
      color: '#4CAF50',
      paths: ['M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z']
    }
  }

  // PowerPoint演示文稿
  if (mime.includes('presentationml') || ['ppt', 'pptx'].includes(ext)) {
    return {
      color: '#FF9800',
      paths: ['M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01']
    }
  }

  // 压缩文件
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) {
    return {
      color: '#795548',
      paths: ['M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4']
    }
  }

  // 代码文件
  if (['js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml'].includes(ext)) {
    return {
      color: '#00BCD4',
      paths: ['M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4']
    }
  }

  // Python文件
  if (['py', 'pyc', 'pyw'].includes(ext)) {
    return {
      color: '#3776AB',
      paths: ['M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4']
    }
  }

  // Java文件
  if (['java', 'class', 'jar'].includes(ext)) {
    return {
      color: '#007396',
      paths: ['M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4']
    }
  }

  // Markdown文件
  if (['md', 'markdown'].includes(ext)) {
    return {
      color: '#000000',
      paths: ['M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', 'M12 6v6m0 0v6m0-6h6m-6 0H6']
    }
  }

  // 文本文件
  if (mime.startsWith('text/') || ['txt', 'log', 'ini', 'cfg', 'conf'].includes(ext)) {
    return {
      color: '#607D8B',
      paths: ['M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z']
    }
  }

  // 可执行文件
  if (['exe', 'msi', 'app', 'dmg', 'deb', 'rpm'].includes(ext)) {
    return {
      color: '#9E9E9E',
      paths: ['M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2']
    }
  }

  // 字体文件
  if (['ttf', 'otf', 'woff', 'woff2', 'eot'].includes(ext)) {
    return {
      color: '#673AB7',
      paths: ['M4 7V4h16v3M9 20h6M12 4v16']
    }
  }

  // 数据库文件
  if (['db', 'sqlite', 'sql', 'mdb'].includes(ext)) {
    return {
      color: '#FF5722',
      paths: ['M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4']
    }
  }

  // 默认文件图标
  return {
    color: '#9E9E9E',
    paths: ['M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z']
  }
}
