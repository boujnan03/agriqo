/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the FastAPI backend as seen from the BROWSER. Baked in at build time. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
