// Type declarations for Editor.js plugins without official types

declare module '@editorjs/marker' {
  import { InlineTool } from '@editorjs/editorjs'

  export default class Marker implements InlineTool {
    static get isInline(): boolean
    static get sanitize(): any
    static get title(): string

    constructor(config?: any)

    render(): HTMLElement
    surround(range: Range): void
    checkState(selection: Selection): boolean
    clear(): void
  }
}

declare module '@editorjs/underline' {
  import { InlineTool } from '@editorjs/editorjs'

  export default class Underline implements InlineTool {
    static get isInline(): boolean
    static get sanitize(): any
    static get title(): string

    constructor(config?: any)

    render(): HTMLElement
    surround(range: Range): void
    checkState(selection: Selection): boolean
    clear(): void
  }
}
