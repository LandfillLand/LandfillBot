export type ToastColor = 'success' | 'error' | 'primary' | 'info' | 'warning' | string

export type PluginSource = {
  name: string
  url: string
}

export type PluginMarketItem = {
  name: string
  desc?: string
  author?: string
  repo?: string
  installed: boolean
  version: string
  social_link?: string
  tags: string[]
  logo: string
  pinned: boolean
  stars: number
  updated_at: string
  display_name: string

  // UI-derived fields
  trimmedName?: string
  searchIndex?: string
}

export type PluginHandlerInfo = {
  event_type?: string
  event_type_h?: string
  desc?: string
  type?: string
  cmd?: string
}

export type InstalledPlugin = {
  name: string
  desc?: string
  author?: string
  repo?: string
  version?: string
  activated?: boolean
  reserved?: boolean

  // update related
  online_version?: string
  has_update?: boolean

  // UX
  display_name?: string
  logo?: string

  // plugin metadata
  handlers?: PluginHandlerInfo[]
}

export type UninstallOptions = {
  deleteConfig?: boolean
  deleteData?: boolean
}

export type ExtensionActiveTab = 'installed' | 'mcp' | 'market' | 'components'
