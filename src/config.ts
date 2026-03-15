import type { OpenClawPluginApi } from "openclaw/plugin-sdk"

const BUILTIN_CONFIG = {
  serverUrl: "http://localhost:6689",
} as const

type RawPluginConfig = {
  serverUrl?: string
  token?: string
  tokenEnv?: string
  defaultDatabaseId?: string
} & Record<string, unknown>

export type PluginConfig = {
  serverUrl: string
  token?: string
  tokenEnv?: string
  defaultDatabaseId?: string
}

/** Normalizes raw plugin config into the runtime shape used by the plugin. */
export const toPluginConfig = (api: Pick<OpenClawPluginApi, "pluginConfig">): PluginConfig => {
  const rawConfig = (api?.pluginConfig ?? {}) as RawPluginConfig

  return {
    serverUrl: rawConfig.serverUrl ?? BUILTIN_CONFIG.serverUrl,
    token: rawConfig.token,
    tokenEnv: rawConfig.tokenEnv,
    defaultDatabaseId: rawConfig.defaultDatabaseId,
  }
}

/** Resolves the authentication token from config or environment variable. */
export const resolveToken = (config: PluginConfig): string | null => {
  if (config.token) return config.token
  if (!config.tokenEnv) return null
  return process.env[config.tokenEnv] ?? null
}
