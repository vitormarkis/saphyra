/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string
  readonly PROD: boolean
  readonly DEV: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
