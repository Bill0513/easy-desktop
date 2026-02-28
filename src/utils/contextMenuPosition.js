const DEFAULT_VIEWPORT_MARGIN = 8

/**
 * @param {{ x: number; y: number }} anchor
 * @param {{ width: number; height: number }} menuSize
 * @param {{ width: number; height: number }} viewportSize
 * @param {number} [margin]
 */
export function computeContextMenuPosition(anchor, menuSize, viewportSize, margin = DEFAULT_VIEWPORT_MARGIN) {
  const maxX = viewportSize.width - menuSize.width - margin
  const maxY = viewportSize.height - menuSize.height - margin

  const clampedX = Math.min(anchor.x, maxX)
  const clampedY = Math.min(anchor.y, maxY)

  return {
    x: Math.max(margin, clampedX),
    y: Math.max(margin, clampedY)
  }
}

