// Utility for managing sidebar customization in localStorage

const STORAGE_KEY = 'astrbot_sidebar_customization'

export type SidebarItem = {
  title?: string
  icon?: string
  children?: SidebarItem[]
}

export type SidebarCustomization = {
  mainItems?: string[]
  moreItems?: string[]
}

export type ResolveSidebarOptions = {
  cloneItems?: boolean
  assembleMoreGroup?: boolean
}

/**
 * Get the customized sidebar configuration from localStorage
 */
export function getSidebarCustomization(): SidebarCustomization | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as SidebarCustomization
  } catch (error) {
    console.error('Error reading sidebar customization:', error)
    return null
  }
}

/**
 * Save the sidebar customization to localStorage
 */
export function setSidebarCustomization(config: SidebarCustomization) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (error) {
    console.error('Error saving sidebar customization:', error)
  }
}

/**
 * Clear the sidebar customization (reset to default)
 */
export function clearSidebarCustomization() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Error clearing sidebar customization:', error)
  }
}

/**
 * 解析侧边栏默认项与用户定制，返回主区/更多区及可选的合并结果
 */
export function resolveSidebarItems(
  defaultItems: SidebarItem[],
  customization: SidebarCustomization | null,
  options: ResolveSidebarOptions = {}
): { mainItems: SidebarItem[]; moreItems: SidebarItem[]; merged?: SidebarItem[] } {
  const { cloneItems = false, assembleMoreGroup = false } = options

  const all = new Map<string, SidebarItem>()
  const defaultMain: string[] = []
  const defaultMore: string[] = []

  // 收集所有条目，按 title 建索引
  defaultItems.forEach((item) => {
    if (item.children) {
      item.children.forEach((child) => {
        if (typeof child.title !== 'string' || !child.title) return
        all.set(child.title, cloneItems ? ({ ...child } as SidebarItem) : child)
        defaultMore.push(child.title)
      })
    } else {
      if (typeof item.title !== 'string' || !item.title) return
      all.set(item.title, cloneItems ? ({ ...item } as SidebarItem) : item)
      defaultMain.push(item.title)
    }
  })

  const hasCustomization = Boolean(customization)
  const mainKeys = hasCustomization ? customization?.mainItems || [] : defaultMain
  const moreKeys = hasCustomization ? customization?.moreItems || [] : defaultMore
  const used = hasCustomization
    ? new Set([...mainKeys, ...moreKeys])
    : new Set(defaultMain.concat(defaultMore))

  const mainItems = mainKeys.map((title) => all.get(title)).filter(Boolean) as SidebarItem[]

  if (hasCustomization) {
    // 补充新增默认主区项
    defaultMain.forEach((title) => {
      if (!used.has(title)) {
        const item = all.get(title)
        if (item) mainItems.push(item)
      }
    })
  }

  const moreItems = moreKeys.map((title) => all.get(title)).filter(Boolean) as SidebarItem[]

  if (hasCustomization) {
    // 补充新增默认更多区项
    defaultMore.forEach((title) => {
      if (!used.has(title)) {
        const item = all.get(title)
        if (item) moreItems.push(item)
      }
    })
  }

  let merged: SidebarItem[] | undefined
  if (assembleMoreGroup) {
    const children = cloneItems ? moreItems.map((item) => ({ ...item })) : [...moreItems]
    if (children.length > 0) {
      merged = [
        ...mainItems,
        {
          title: 'core.navigation.groups.more',
          icon: 'mdi-dots-horizontal',
          children
        }
      ]
    } else {
      merged = [...mainItems]
    }
  }

  return { mainItems, moreItems, merged }
}

/**
 * 应用侧边栏定制，返回包含更多分组的完整结构
 */
export function applySidebarCustomization(defaultItems: SidebarItem[]): SidebarItem[] {
  const customization = getSidebarCustomization()
  const { merged } = resolveSidebarItems(defaultItems, customization, {
    cloneItems: true,
    assembleMoreGroup: true
  })
  return merged || defaultItems
}
