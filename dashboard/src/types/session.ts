export interface SessionServiceConfig {
  session_enabled?: boolean
  llm_enabled?: boolean
  tts_enabled?: boolean
  custom_name?: string
  persona_id?: string | null
  [key: string]: unknown
}

export interface SessionPluginConfig {
  enabled_plugins?: string[]
  disabled_plugins?: string[]
  [key: string]: unknown
}

export interface SessionKbConfig {
  kb_ids?: string[]
  top_k?: number
  enable_rerank?: boolean
  [key: string]: unknown
}

export interface SessionRules {
  session_service_config?: SessionServiceConfig
  session_plugin_config?: SessionPluginConfig
  kb_config?: SessionKbConfig
  // provider_perf_* keys etc.
  [key: string]: unknown
}

export interface SessionRuleItem {
  umo: string
  platform?: string
  message_type?: string
  session_id?: string
  rules: SessionRules
  [key: string]: unknown
}

export interface SessionGroup {
  id: string
  name: string
  umo_count: number
  umos?: string[]
  [key: string]: unknown
}

export interface KnowledgeBaseSummary {
  kb_id: string
  kb_name: string
  emoji?: string
  [key: string]: unknown
}

export interface PluginSummary {
  name: string
  display_name?: string
  [key: string]: unknown
}
