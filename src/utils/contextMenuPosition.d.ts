export interface MenuAnchorPoint {
  x: number
  y: number
}

export interface MenuBoxSize {
  width: number
  height: number
}

export interface ViewportSize {
  width: number
  height: number
}

export function computeContextMenuPosition(
  anchor: MenuAnchorPoint,
  menuSize: MenuBoxSize,
  viewportSize: ViewportSize,
  margin?: number
): MenuAnchorPoint

