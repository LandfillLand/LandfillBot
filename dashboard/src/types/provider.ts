export type ProviderType =
  | 'chat_completion'
  | 'agent_runner'
  | 'speech_to_text'
  | 'text_to_speech'
  | 'embedding'
  | 'rerank'

export type ProviderStatusValue = 'available' | 'unavailable' | 'pending' | (string & {})

export interface ProviderBase {
  id: string
  name?: string
  type?: string
  provider?: string
  provider_type?: string
  provider_source_id?: string
  model?: string
  enable?: boolean
  enabled?: boolean
  api_base?: string
  [key: string]: unknown
}

export interface ProviderStatus {
  id: string
  name?: string
  status: ProviderStatusValue
  error?: unknown
}

export interface ProviderSource {
  id: string
  provider_type?: ProviderType | string
  type?: string
  api_base?: string
  [key: string]: unknown
}

export interface PersonaSummary {
  name: string
  [key: string]: unknown
}

export interface ProviderSummary {
  id: string
  name: string
  model?: string
  display_name?: string
  [key: string]: unknown
}
