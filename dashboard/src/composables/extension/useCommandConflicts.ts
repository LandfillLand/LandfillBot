import axios from 'axios'
import { reactive } from 'vue'

import type { ApiResponse } from '@/types/api'

export function useCommandConflicts({
  onGoToManage
}: {
  onGoToManage: () => void
}) {
  const conflictDialog = reactive({
    show: false,
    count: 0
  })

  const checkAndPromptConflicts = async () => {
    try {
      const res = await axios.get<ApiResponse<{ summary?: { conflicts?: number } }>>('/api/commands')
      if (res.data.status === 'ok') {
        const conflicts = res.data.data.summary?.conflicts || 0
        if (conflicts > 0) {
          conflictDialog.count = conflicts
          conflictDialog.show = true
        }
      }
    } catch (err) {
      console.debug('Failed to check command conflicts:', err)
    }
  }

  const handleConflictConfirm = () => {
    onGoToManage()
  }

  return {
    conflictDialog,
    checkAndPromptConflicts,
    handleConflictConfirm
  }
}
