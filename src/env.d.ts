/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// simple-mind-map plugins
declare module 'simple-mind-map/src/plugins/Drag.js' {
  const Drag: any
  export default Drag
}

declare module 'simple-mind-map/src/plugins/Select.js' {
  const Select: any
  export default Select
}

declare module 'simple-mind-map/src/plugins/Export.js' {
  const Export: any
  export default Export
}

declare module 'simple-mind-map/src/plugins/KeyboardNavigation.js' {
  const KeyboardNavigation: any
  export default KeyboardNavigation
}
