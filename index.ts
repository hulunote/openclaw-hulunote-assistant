import type { OpenClawPluginApi } from "openclaw/plugin-sdk"
import { toPluginConfig } from "./src/config.js"
import { registerHulunoteTools } from "./src/tools.js"

/** Registers the Hulunote assistant plugin tools */
export default function register(api: OpenClawPluginApi) {
  const pluginConfig = toPluginConfig(api)
  registerHulunoteTools(api, pluginConfig)
}
