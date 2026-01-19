<template>
  <div class="platform-page">
    <v-container fluid class="pa-0">
      <v-row class="d-flex justify-space-between align-center px-4 py-3 pb-8">
        <div>
          <h1 class="text-h1 font-weight-bold mb-2 d-flex align-center">
            <v-icon color="black" class="me-2">mdi-robot</v-icon>{{ tm('title') }}
          </h1>
          <p class="text-subtitle-1 text-medium-emphasis mb-4">
            {{ tm('subtitle') }}
          </p>
        </div>
        <v-btn color="primary" prepend-icon="mdi-plus" variant="tonal" @click="updatingMode = false; showAddPlatformDialog = true"
          rounded="xl" size="x-large">
          {{ tm('addAdapter') }}
        </v-btn>
      </v-row>

      <div>
        <v-row v-if="(config_data.platform || []).length === 0">
          <v-col cols="12" class="text-center pa-8">
            <v-icon size="64" color="grey-lighten-1">mdi-connection</v-icon>
            <p class="text-grey mt-4">{{ tm('emptyText') }}</p>
          </v-col>
        </v-row>

        <v-row v-else>
          <v-col v-for="(platform, index) in config_data.platform || []" :key="index" cols="12" sm="6" md="6" lg="4" xl="3">
            <item-card 
              :item="platform" 
              title-field="id" 
              enabled-field="enable"
              title-class="text-h3" 
              :bglogo="getPlatformIcon(platform.type || platform.id)" 
              @toggle-enabled="platformStatusChange"
              @delete="deletePlatform" 
              @edit="editPlatform" 
              class="platform-card-item"
            >
              <template #item-details="{ item }">
                <div class="platform-status-row mb-2" v-if="getPlatformStat(item?.id) && (getPlatformStat(item?.id)?.status !== 'running' || (getPlatformStat(item?.id)?.error_count || 0) > 0)">
                  <v-chip
                    v-if="getPlatformStat(item?.id)?.status !== 'running'"
                    size="small"
                    :color="getStatusColor(getPlatformStat(item?.id)?.status)"
                    variant="tonal"
                    class="status-chip"
                  >
                    <v-icon size="small" start>{{ getStatusIcon(getPlatformStat(item?.id)?.status) }}</v-icon>
                    {{ tm('runtimeStatus.' + (getPlatformStat(item?.id)?.status || 'unknown')) }}
                  </v-chip>
                  <v-chip
                    v-if="(getPlatformStat(item?.id)?.error_count || 0) > 0"
                    size="small"
                    color="error"
                    variant="tonal"
                    class="error-chip"
                    :class="{ 'ms-2': getPlatformStat(item?.id)?.status !== 'running' }"
                    @click.stop="showErrorDetails(item)"
                  >
                    <v-icon size="small" start>mdi-bug</v-icon>
                    {{ getPlatformStat(item?.id)?.error_count || 0 }} {{ tm('runtimeStatus.errors') }}
                  </v-chip>
                </div>
                <div v-if="getPlatformStat(item?.id)?.unified_webhook && item.webhook_uuid" class="webhook-info">
                  <v-chip
                    size="small"
                    color="primary"
                    variant="tonal"
                    class="webhook-chip"
                    @click.stop="openWebhookDialog(item.webhook_uuid)"
                  >
                    <v-icon size="small" start>mdi-webhook</v-icon>
                    {{ tm('viewWebhook') }}
                  </v-chip>
                </div>
              </template>
            </item-card>
          </v-col>
        </v-row>
      </div>

      <v-card elevation="0" class="mt-4 mb-10">
        <v-card-title class="d-flex align-center py-3 px-4">
          <v-icon class="me-2">mdi-console-line</v-icon>
          <span class="text-h4">{{ tm('logs.title') }}</span>
          <v-spacer></v-spacer>
          <v-btn variant="text" color="primary" @click="showConsole = !showConsole">
            {{ showConsole ? tm('logs.collapse') : tm('logs.expand') }}
            <v-icon>{{ showConsole ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </v-btn>
        </v-card-title>

        <v-expand-transition>
          <v-card-text class="pa-0" v-if="showConsole">
            <ConsoleDisplayer style="background-color: #1e1e1e; height: 300px; border-radius: 0"></ConsoleDisplayer>
          </v-card-text>
        </v-expand-transition>
      </v-card>
    </v-container>

    <AddNewPlatform v-model:show="showAddPlatformDialog" :metadata="metadata" :config_data="config_data" ref="addPlatformDialog"
      :updating-mode="updatingMode" :updating-platform-config="updatingPlatformConfig"
      @show-toast="showToast" @refresh-config="getConfig"/>

    <v-dialog v-model="showWebhookDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center pa-4">
          <v-icon class="me-2" color="primary">mdi-webhook</v-icon>
          {{ tm('webhookDialog.title') }}
        </v-card-title>
        <v-card-text class="px-4 pb-2">
          <p class="text-body-2 text-medium-emphasis mb-3">{{ tm('webhookDialog.description') }}</p>
          <v-text-field
            :model-value="currentWebhookUrl"
            readonly
            variant="outlined"
            hide-details
            class="webhook-url-field"
          >
            <template v-slot:append-inner>
              <v-btn
                icon
                size="small"
                variant="text"
                @click="copyWebhookUrl(currentWebhookUuid)"
              >
                <v-icon>mdi-content-copy</v-icon>
              </v-btn>
            </template>
          </v-text-field>
        </v-card-text>
        <v-card-actions class="pa-4 pt-2">
          <v-spacer></v-spacer>
          <v-btn variant="tonal" color="primary" @click="showWebhookDialog = false">
            {{ tm('webhookDialog.close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showErrorDialog" max-width="700">
      <v-card>
        <v-card-title class="d-flex align-center pa-4">
          <v-icon class="me-2" color="error">mdi-alert-circle</v-icon>
          {{ tm('errorDialog.title') }}
        </v-card-title>
        <v-card-text class="px-4 pb-4" v-if="currentErrorPlatform">
          <div class="mb-3">
            <strong>{{ tm('errorDialog.platformId') }}:</strong> {{ currentErrorPlatform.id }}
          </div>
          <div class="mb-3">
            <strong>{{ tm('errorDialog.errorCount') }}:</strong> {{ currentErrorPlatform.error_count }}
          </div>
          <div v-if="currentErrorPlatform.last_error" class="error-details">
            <div class="mb-2">
              <strong>{{ tm('errorDialog.lastError') }}:</strong>
            </div>
            <v-alert type="error" variant="tonal" class="mb-3">
              <div class="error-message">{{ currentErrorPlatform.last_error.message }}</div>
              <div class="error-time text-caption text-medium-emphasis mt-1">
                {{ tm('errorDialog.occurredAt') }}: {{ new Date(currentErrorPlatform.last_error.timestamp).toLocaleString() }}
              </div>
            </v-alert>
            <div v-if="currentErrorPlatform.last_error.traceback">
              <div class="mb-2">
                <strong>{{ tm('errorDialog.traceback') }}:</strong>
              </div>
              <pre class="traceback-box">{{ currentErrorPlatform.last_error.traceback }}</pre>
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="tonal" color="primary" @click="showErrorDialog = false">
            {{ tm('errorDialog.close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar :timeout="3000" elevation="24" :color="save_message_success" v-model="save_message_snack"
      location="top">
      {{ save_message }}
    </v-snackbar>
  </div>
</template>

<script lang="ts">
import axios from 'axios';
import AstrBotConfig from '@/components/shared/AstrBotConfig.vue';
import WaitingForRestart from '@/components/shared/WaitingForRestart.vue';
import ConsoleDisplayer from '@/components/shared/ConsoleDisplayer.vue';
import ItemCard from '@/components/shared/ItemCard.vue';
import AddNewPlatform from '@/components/platform/AddNewPlatform.vue';
import { useCommonStore } from '@/stores/common';
import { useI18n, useModuleI18n } from '@/i18n/composables';
import { getPlatformIcon } from '@/utils/platformUtils';

type AnyRecord = Record<string, any>;

type PlatformConfig = AnyRecord & {
  id: string;
  type?: string;
  enable?: boolean;
  webhook_uuid?: string;
};

type PlatformLastError = {
  message: string;
  timestamp: number;
  traceback?: string;
};

type PlatformStat = AnyRecord & {
  id: string;
  status?: string;
  error_count?: number;
  unified_webhook?: boolean;
  last_error?: PlatformLastError;
};

export default {
  name: 'PlatformPage',
  components: {
    AstrBotConfig,
    WaitingForRestart,
    ConsoleDisplayer,
    ItemCard,
    AddNewPlatform
  },
  setup() {
    const { t } = useI18n();
    const { tm } = useModuleI18n('features/platform');

    return {
      t,
      tm
    };
  },
  data() {
    return {
      config_data: {} as any,
      fetched: false,
      metadata: {} as any,
      showAddPlatformDialog: false,

      updatingPlatformConfig: {} as PlatformConfig,
      updatingMode: false,

      save_message_snack: false,
      save_message: "",
      save_message_success: "success",

      showConsole: localStorage.getItem('platformPage_showConsole') === 'true',

      showWebhookDialog: false,
      currentWebhookUuid: '',

      platformStats: {} as Record<string, PlatformStat>,
      statsRefreshInterval: null as ReturnType<typeof setInterval> | null,

      showIdConflictDialog: false,
      idConflictResolve: null as any,
      showOneBotEmptyTokenWarnDialog: false,
      oneBotEmptyTokenWarningResolve: null as any,

      showErrorDialog: false,
      currentErrorPlatform: null as PlatformStat | null,

      store: useCommonStore()
    }
  },

  watch: {
    showConsole(newValue) {
      localStorage.setItem('platformPage_showConsole', newValue.toString());
    },

    showIdConflictDialog(newValue) {
      if (!newValue && this.idConflictResolve) {
        this.idConflictResolve(false);
        this.idConflictResolve = null;
      }
    },

    showOneBotEmptyTokenWarnDialog(newValue) {
      if (!newValue && this.oneBotEmptyTokenWarningResolve) {
        this.oneBotEmptyTokenWarningResolve(true);
        this.oneBotEmptyTokenWarningResolve = null;
      }
    }
  },

  mounted() {
    this.getConfig();
    this.getPlatformStats();
    this.statsRefreshInterval = setInterval(() => {
      this.getPlatformStats();
    }, 10000);
  },

  beforeUnmount() {
    if (this.statsRefreshInterval) {
      clearInterval(this.statsRefreshInterval);
    }
  },

  methods: {
    getPlatformIcon(platform_id: string) {
      const template = this.metadata['platform_group']?.metadata?.platform?.config_template?.[platform_id];
      if (template && template.logo_token) {
        return `/api/file/${template.logo_token}`;
      }
      return getPlatformIcon(platform_id);
    },

    getConfig() {
      axios.get('/api/config/get').then((res) => {
        this.config_data = res.data.data.config;
        this.fetched = true
        this.metadata = res.data.data.metadata;
      }).catch((err) => {
        this.showError(err);
      });
    },

    getPlatformStats() {
      axios.get('/api/platform/stats').then((res) => {
        if (res.data.status === 'ok') {
          const stats: Record<string, PlatformStat> = {};
          for (const platform of (res.data.data.platforms || []) as PlatformStat[]) {
            stats[platform.id] = platform;
          }
          this.platformStats = stats;
        }
      }).catch((err) => {
        console.warn('获取平台统计信息失败:', err);
      });
    },

    getPlatformStat(platformId?: string) {
      if (!platformId) return null;
      return this.platformStats[platformId] || null;
    },

    getStatusColor(status: string | undefined) {
      switch (status) {
        case 'running': return 'success';
        case 'error': return 'error';
        case 'pending': return 'warning';
        case 'stopped': return 'grey';
        default: return 'grey';
      }
    },

    getStatusIcon(status: string | undefined) {
      switch (status) {
        case 'running': return 'mdi-check-circle';
        case 'error': return 'mdi-alert-circle';
        case 'pending': return 'mdi-clock-outline';
        case 'stopped': return 'mdi-stop-circle';
        default: return 'mdi-help-circle';
      }
    },

    showErrorDetails(platform: PlatformConfig) {
      const stat = this.getPlatformStat(platform.id);
      if (stat && (stat.error_count || 0) > 0) {
        this.currentErrorPlatform = stat;
        this.showErrorDialog = true;
      }
    },

    editPlatform(platform: PlatformConfig) {
      this.updatingPlatformConfig = JSON.parse(JSON.stringify(platform)) as PlatformConfig;
      this.updatingMode = true;
      this.showAddPlatformDialog = true;
      this.$nextTick(() => {
        (this.$refs.addPlatformDialog as any)?.toggleShowConfigSection?.();
      });
    },

    deletePlatform(platform: PlatformConfig) {
      if (confirm(`${this.messages.deleteConfirm} ${platform.id}?`)) {
        axios.post('/api/config/platform/delete', { id: platform.id }).then((res) => {
          this.getConfig();
          this.showSuccess(res.data.message || this.messages.deleteSuccess);
        }).catch((err) => {
          const message = axios.isAxiosError(err)
            ? (err.response?.data?.message || err.message)
            : (err instanceof Error ? err.message : String(err));
          this.showError(message);
        });
      }
    },

    platformStatusChange(platform: PlatformConfig) {
      platform.enable = !platform.enable;

      axios.post('/api/config/platform/update', {
        id: platform.id,
        config: platform
      }).then((res) => {
        this.getConfig();
        this.showSuccess(res.data.message || this.messages.statusUpdateSuccess);
      }).catch((err) => {
        platform.enable = !platform.enable;
        const message = axios.isAxiosError(err)
          ? (err.response?.data?.message || err.message)
          : (err instanceof Error ? err.message : String(err));
        this.showError(message);
      });
    },

    showToast({ message, type }: { message: string; type: 'success' | 'error' }) {
      if (type === 'success') {
        this.showSuccess(message);
      } else if (type === 'error') {
        this.showError(message);
      }
    },

    showSuccess(message: string) {
      this.save_message = message;
      this.save_message_success = "success";
      this.save_message_snack = true;
    },

    showError(message: string) {
      this.save_message = message;
      this.save_message_success = "error";
      this.save_message_snack = true;
    },

    getWebhookUrl(webhookUuid: string) {
      let callbackBase = this.config_data.callback_api_base || '';
      if (!callbackBase) {
        callbackBase = "http(s)://<your-domain-or-ip>";
      }
      if (callbackBase) {
        return `${callbackBase.replace(/\/$/, '')}/api/platform/webhook/${webhookUuid}`;
      }
      return `/api/platform/webhook/${webhookUuid}`;
    },

    openWebhookDialog(webhookUuid: string) {
      this.currentWebhookUuid = webhookUuid;
      this.showWebhookDialog = true;
    },

    async copyWebhookUrl(webhookUuid: string) {
      const url = this.getWebhookUrl(webhookUuid);
      try {
        await navigator.clipboard.writeText(url);
        this.showSuccess(this.tm('webhookCopied'));
      } catch (err) {
        this.showError(this.tm('webhookCopyFailed'));
      }
    }
  },
  computed: {
    messages() {
      return {
        updateSuccess: this.tm('messages.updateSuccess'),
        addSuccess: this.tm('messages.addSuccess'),
        deleteSuccess: this.tm('messages.deleteSuccess'),
        statusUpdateSuccess: this.tm('messages.statusUpdateSuccess'),
        deleteConfirm: this.tm('messages.deleteConfirm')
      };
    },
    currentWebhookUrl() {
      return this.getWebhookUrl(this.currentWebhookUuid);
    }
  }
}
</script>

<style scoped>
.platform-page {
  padding: 20px;
  padding-top: 8px;
  padding-bottom: 40px;
}

.webhook-info {
  margin-top: 4px;
}

.webhook-chip {
  cursor: pointer;
}

.platform-status-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.status-chip {
  font-size: 12px;
}

.error-chip {
  cursor: pointer;
  font-size: 12px;
}

.error-details {
  margin-top: 8px;
}

.error-message {
  word-break: break-word;
}

.traceback-box {
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}

.platform-card-item {
  min-height: 200px;
}

.platform-card-item :deep(.v-card-title) {
  flex-wrap: nowrap;
}

.platform-card-item :deep(.v-card-title > span) {
  min-width: 0;
  flex: 1;
}

/* 仅在平台页面：将卡片底部按钮放到左侧 */
.platform-card-item :deep(.v-card-actions) {
  justify-content: flex-start;
}

.platform-card-item :deep(.v-card-actions .v-spacer) {
  display: none;
}

.platform-card-item :deep(.v-switch) {
  flex-shrink: 0;
  margin-left: 8px;
}
</style>