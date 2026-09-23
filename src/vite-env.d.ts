/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANTHROPIC_API_KEY: string
  readonly VITE_USE_AI_RELAY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
