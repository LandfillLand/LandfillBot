import { defineStore } from 'pinia'
import axios from 'axios'

import type { PluginMarketItem } from '@/types/extension'

type CommonState = {
  startTime: number
  pluginMarketData: PluginMarketItem[]
}

export const useCommonStore = defineStore('common', {
  state: (): CommonState => ({
    startTime: -1,
    pluginMarketData: []
  }),
  actions: {
    getStartTime() {
      if (this.startTime !== -1) {
        return this.startTime
      }
      axios.get('/api/stat/start-time').then((res) => {
        this.startTime = res.data.data.start_time
      })
    },

    async getPluginCollections(force = false, customSource: string | null = null): Promise<PluginMarketItem[]> {
      // 获取插件市场数据
      if (!force && this.pluginMarketData.length > 0 && !customSource) {
        return Promise.resolve(this.pluginMarketData)
      }

      // 构建URL
      let url = force ? '/api/plugin/market_list?force_refresh=true' : '/api/plugin/market_list'
      if (customSource) {
        url += (url.includes('?') ? '&' : '?') + `custom_registry=${encodeURIComponent(customSource)}`
      }

      return axios
        .get(url)
        .then((res) => {
          const data: PluginMarketItem[] = []
          if (res.data.data && typeof res.data.data === 'object') {
            for (const key in res.data.data as Record<string, any>) {
              const pluginData = (res.data.data as any)[key]

              data.push({
                name: pluginData.name || key, // 优先使用插件数据中的name字段，否则使用键名
                desc: pluginData.desc,
                author: pluginData.author,
                repo: pluginData.repo,
                installed: false,
                version: pluginData?.version ? pluginData.version : '未知',
                social_link: pluginData?.social_link,
                tags: pluginData?.tags ? pluginData.tags : [],
                logo: pluginData?.logo ? pluginData.logo : '',
                pinned: pluginData?.pinned ? pluginData.pinned : false,
                stars: pluginData?.stars ? pluginData.stars : 0,
                updated_at: pluginData?.updated_at ? pluginData.updated_at : '',
                display_name: pluginData?.display_name ? pluginData.display_name : ''
              })
            }
          }

          this.pluginMarketData = data
          return data
        })
        .catch((err) => {
          return Promise.reject(err)
        })
    }
  }
})
