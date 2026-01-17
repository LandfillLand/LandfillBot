<template>

  <div style="display: flex; flex-direction: column; align-items: center;">
    <div v-if="selectedConfigID || isSystemConfig" class="mt-4 config-panel"
      style="display: flex; flex-direction: column; align-items: start;">

      <!-- 普通配置选择区域 -->
      <div class="d-flex flex-row pr-4"
        style="margin-bottom: 16px; align-items: center; gap: 12px; justify-content: space-between; width: 100%;">
        <div class="d-flex flex-row align-center" style="gap: 12px;">
          <v-select style="min-width: 130px;" v-model="selectedConfigID" :items="configSelectItems" item-title="name" :disabled="initialConfigId !== null"
            v-if="!isSystemConfig" item-value="id" :label="tm('configSelection.selectConfig')" hide-details density="compact" rounded="md"
            variant="outlined" @update:model-value="onConfigSelect">
          </v-select>
          <a style="color: inherit;" href="https://blog.astrbot.app/posts/what-is-changed-in-4.0.0/#%E5%A4%9A%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6" target="_blank"><v-btn icon="mdi-help-circle" size="small" variant="plain"></v-btn></a>

        </div>

        <v-btn-toggle v-model="configType" mandatory color="primary" variant="outlined" density="comfortable"
          rounded="md" @update:model-value="onConfigTypeToggle">
          <v-btn value="normal" prepend-icon="mdi-cog" size="large">
            {{ tm('configSelection.normalConfig') }}
          </v-btn>
          <v-btn value="system" prepend-icon="mdi-cog-outline" size="large">
            {{ tm('configSelection.systemConfig') }}
          </v-btn>
        </v-btn-toggle>
      </div>

      <!-- <v-progress-linear v-if="!fetched" indeterminate color="primary"></v-progress-linear> -->

      <v-slide-y-transition mode="out-in">
        <div v-if="(selectedConfigID || isSystemConfig) && fetched" :key="configContentKey" class="config-content" style="width: 100%;">
          <!-- 可视化编辑 -->
          <AstrBotCoreConfigWrapper 
            :metadata="metadata" 
            :config_data="config_data"
          />

          <v-tooltip :text="tm('actions.save')" location="left">
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                class="config-floating-btn config-floating-btn--save"
                variant="flat"
                icon="mdi-content-save"
                size="x-large"
                @click="updateConfig"
              ></v-btn>
            </template>
          </v-tooltip>

          <v-tooltip :text="tm('codeEditor.title')" location="left">
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                class="config-floating-btn config-floating-btn--editor"
                variant="flat"
                icon="mdi-code-json"
                size="x-large"
                @click="configToString(); codeEditorDialog = true"
              ></v-btn>
            </template>
          </v-tooltip>

          <v-tooltip text="测试当前配置" location="left" v-if="!isSystemConfig">
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                class="config-floating-btn config-floating-btn--test"
                variant="flat"
                icon="mdi-chat-processing"
                size="x-large"
                @click="openTestChat"
              ></v-btn>
            </template>
          </v-tooltip>

        </div>
      </v-slide-y-transition>

    </div>
  </div>


  <!-- Full Screen Editor Dialog -->
  <v-dialog v-model="codeEditorDialog" fullscreen transition="dialog-bottom-transition" scrollable>
    <v-card>
      <v-toolbar color="primary" dark>
        <v-btn icon @click="codeEditorDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>{{ tm('codeEditor.title') }}</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-toolbar-items style="display: flex; align-items: center;">
          <v-tooltip :text="tm('editor.revertCode')" location="bottom">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                prepend-icon="mdi-history"
                variant="text"
                size="small"
                style="margin-left: 16px;"
                :aria-label="tm('editor.revertCode')"
                @click="configToString()"
              >
                {{ tm('editor.revertShort') }}
              </v-btn>
            </template>
          </v-tooltip>
          <v-tooltip v-if="config_data_has_changed" :text="tm('editor.applyConfig')" location="bottom">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                prepend-icon="mdi-check-circle-outline"
                variant="text"
                size="small"
                style="margin-left: 16px;"
                :aria-label="tm('editor.applyConfig')"
                @click="applyStrConfig()"
              >
                {{ tm('editor.applyShort') }}
              </v-btn>
            </template>
          </v-tooltip>
          <v-tooltip :text="tm('editor.applyTip')" location="bottom">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                prepend-icon="mdi-information-outline"
                variant="text"
                size="small"
                style="margin-left: 16px;"
                :aria-label="tm('editor.applyTip')"
              >
                {{ tm('editor.tipShort') }}
              </v-btn>
            </template>
          </v-tooltip>
        </v-toolbar-items>
      </v-toolbar>
      <v-card-text class="pa-0">
        <VueMonacoEditor language="json" theme="vs-dark" style="height: calc(100vh - 64px);"
          v-model:value="config_data_str">
        </VueMonacoEditor>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Config Management Dialog -->
  <v-dialog v-model="configManageDialog" max-width="800px">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span class="text-h4">{{ tm('configManagement.title') }}</span>
        <v-btn icon="mdi-close" variant="text" @click="configManageDialog = false"></v-btn>
      </v-card-title>

      <v-card-text>
        <small>{{ tm('configManagement.description') }}</small>
        <div class="mt-6 mb-4">
          <v-btn prepend-icon="mdi-plus" @click="startCreateConfig" variant="tonal" color="primary">
            {{ tm('configManagement.newConfig') }}
          </v-btn>
        </div>

        <!-- Config List -->
        <v-list lines="two">
          <v-list-item v-for="config in configInfoList" :key="config.id" :title="config.name">
            <template v-slot:append v-if="config.id !== 'default'">
              <div class="d-flex align-center" style="gap: 8px;">
                <v-btn icon="mdi-pencil" size="small" variant="text" color="warning"
                  @click="startEditConfig(config)"></v-btn>
                <v-btn icon="mdi-delete" size="small" variant="text" color="error"
                  @click="confirmDeleteConfig(config)"></v-btn>
              </div>
            </template>
          </v-list-item>
        </v-list>

        <!-- Create/Edit Form -->
        <v-divider v-if="showConfigForm" class="my-6"></v-divider>

        <div v-if="showConfigForm">
          <h3 class="mb-4">{{ isEditingConfig ? tm('configManagement.editConfig') : tm('configManagement.newConfig') }}</h3>

          <h4>{{ tm('configManagement.configName') }}</h4>

          <v-text-field v-model="configFormData.name" :label="tm('configManagement.fillConfigName')" variant="outlined" class="mt-4 mb-4"
            hide-details></v-text-field>

          <div class="d-flex justify-end mt-4" style="gap: 8px;">
            <v-btn variant="text" @click="cancelConfigForm">{{ tm('buttons.cancel') }}</v-btn>
            <v-btn color="primary" @click="saveConfigForm"
              :disabled="!configFormData.name">
              {{ isEditingConfig ? tm('buttons.update') : tm('buttons.create') }}
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-snackbar :timeout="3000" elevation="24" :color="save_message_success" v-model="save_message_snack">
    {{ save_message }}
  </v-snackbar>

  <WaitingForRestart ref="wfr"></WaitingForRestart>

  <!-- 测试聊天抽屉 -->
  <v-overlay
    v-model="testChatDrawer"
    class="test-chat-overlay"
    location="right"
    transition="slide-x-reverse-transition"
    :scrim="true"
    @click:outside="closeTestChat"
  >
    <v-card class="test-chat-card" elevation="12">
      <div class="test-chat-header">
        <div>
          <span class="text-h6">测试配置</span>
          <div v-if="selectedConfigInfo.name" class="text-caption text-grey">
            {{ selectedConfigInfo.name }} ({{ testConfigId }})
          </div>
        </div>
        <v-btn icon variant="text" @click="closeTestChat">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
      <v-divider></v-divider>
      <div class="test-chat-content">
        <StandaloneChat v-if="testChatDrawer" :configId="testConfigId" />
      </div>
    </v-card>
  </v-overlay>
</template>


<script lang="ts">
import axios from 'axios';
import type { PropType } from 'vue'
import AstrBotCoreConfigWrapper from '@/components/config/AstrBotCoreConfigWrapper.vue';
import WaitingForRestart from '@/components/shared/WaitingForRestart.vue';
import StandaloneChat from '@/components/chat/StandaloneChat.vue';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import { useI18n, useModuleI18n } from '@/i18n/composables';

type AnyRecord = Record<string, any>

type ConfigInfo = {
  id: string
  name: string
  [key: string]: any
}

export default {
  name: 'ConfigPage',
  components: {
    AstrBotCoreConfigWrapper,
    VueMonacoEditor,
    WaitingForRestart,
    StandaloneChat
  },
  props: {
    initialConfigId: {
      type: String as PropType<string | null>,
      default: null
    }
  },
  setup() {
    const { t } = useI18n();
    const { tm } = useModuleI18n('features/config');

    return {
      t,
      tm
    };
  },

  computed: {
    messages() {
      return {
        loadError: this.tm('messages.loadError'),
        saveSuccess: this.tm('messages.saveSuccess'),
        saveError: this.tm('messages.saveError'),
        configApplied: this.tm('messages.configApplied'),
        configApplyError: this.tm('messages.configApplyError')
      };
    },
    configInfoNameList() {
      return this.configInfoList.map((info) => info.name);
    },
    selectedConfigInfo() {
      return this.configInfoList.find((info) => info.id === this.selectedConfigID) || ({} as ConfigInfo);
    },
    configSelectItems() {
      const items = [...this.configInfoList];
      items.push({
        id: '_%manage%_',
        name: this.tm('configManagement.manageConfigs'),
        umop: []
      });
      return items;
    },
  },
  watch: {
    config_data_str(val) {
      this.config_data_has_changed = true;
    },
    initialConfigId(newVal) {
      if (!newVal) {
        return;
      }
      if (this.selectedConfigID !== newVal) {
        this.getConfigInfoList(newVal);
      }
    }
  },
  data() {
    return {
      codeEditorDialog: false,
      configManageDialog: false,
      showConfigForm: false,
      isEditingConfig: false,
      config_data_has_changed: false,
      config_data_str: "",
      config_data: {
        config: {}
      },
      fetched: false,
        metadata: {} as AnyRecord,
      save_message_snack: false,
      save_message: "",
      save_message_success: "",
  configContentKey: 0,

      // 配置类型切换
      configType: 'normal', // 'normal' 或 'system'

      // 系统配置开关
      isSystemConfig: false,

      // 多配置文件管理
      selectedConfigID: null as string | null, // 用于存储当前选中的配置项信息
      configInfoList: [] as ConfigInfo[],
      configFormData: {
        name: '',
      },
      editingConfigId: null as string | null,

      // 测试聊天
      testChatDrawer: false,
      testConfigId: null as string | null,
    }
  },
  mounted() {
    const targetConfigId = this.initialConfigId || 'default';
    this.getConfigInfoList(targetConfigId);
    // 初始化配置类型状态
    this.configType = this.isSystemConfig ? 'system' : 'normal';
  },
  methods: {
    getConfigInfoList(abconf_id?: string | null) {
      // 获取配置列表
      axios.get('/api/config/abconfs').then((res) => {
        this.configInfoList = (res.data.data.info_list || []) as ConfigInfo[];

        if (abconf_id) {
          let matched = false;
          for (let i = 0; i < this.configInfoList.length; i++) {
            if (this.configInfoList[i].id === abconf_id) {
              this.selectedConfigID = this.configInfoList[i].id;
              this.getConfig(abconf_id);
              matched = true;
              break;
            }
          }

          if (!matched && this.configInfoList.length) {
            // 当找不到目标配置时，默认展示列表中的第一个配置
            this.selectedConfigID = this.configInfoList[0].id;
            this.getConfig(this.configInfoList[0].id);
          }
        }
      }).catch((err) => {
        this.save_message = this.messages.loadError;
        this.save_message_snack = true;
        this.save_message_success = "error";
      });
    },
    getConfig(abconf_id?: string | null) {
      this.fetched = false
      const params: any = {};

      if (this.isSystemConfig) {
        params.system_config = '1';
      } else {
        params.id = abconf_id || this.selectedConfigID || undefined;
      }

      axios.get('/api/config/abconf', {
        params: params
      }).then((res) => {
        this.config_data = res.data.data.config;
        this.fetched = true
        this.metadata = res.data.data.metadata;
        this.configContentKey += 1;
      }).catch((err) => {
        this.save_message = this.messages.loadError;
        this.save_message_snack = true;
        this.save_message_success = "error";
      });
    },
    updateConfig() {
      if (!this.fetched) return;

      const postData: any = {
        config: JSON.parse(JSON.stringify(this.config_data)),
      };

      if (this.isSystemConfig) {
        postData.conf_id = 'default';
      } else {
        postData.conf_id = this.selectedConfigID;
      }

      axios.post('/api/config/astrbot/update', postData).then((res) => {
        if (res.data.status === "ok") {
          this.save_message = res.data.message || this.messages.saveSuccess;
          this.save_message_snack = true;
          this.save_message_success = "success";

          if (this.isSystemConfig) {
            axios.post('/api/stat/restart-core').then(() => {
              (this.$refs.wfr as any)?.check?.();
            })
          }
        } else {
          this.save_message = res.data.message || this.messages.saveError;
          this.save_message_snack = true;
          this.save_message_success = "error";
        }
      }).catch((err) => {
        this.save_message = this.messages.saveError;
        this.save_message_snack = true;
        this.save_message_success = "error";
      });
    },
    configToString() {
      this.config_data_str = JSON.stringify(this.config_data, null, 2);
      this.config_data_has_changed = false;
    },
    applyStrConfig() {
      try {
        this.config_data = JSON.parse(this.config_data_str);
        this.config_data_has_changed = false;
        this.save_message_success = "success";
        this.save_message = this.messages.configApplied;
        this.save_message_snack = true;
      } catch (e) {
        this.save_message_success = "error";
        this.save_message = this.messages.configApplyError;
        this.save_message_snack = true;
      }
    },
    createNewConfig() {
      axios.post('/api/config/abconf/new', {
        name: this.configFormData.name
      }).then((res) => {
        if (res.data.status === "ok") {
          this.save_message = res.data.message;
          this.save_message_snack = true;
          this.save_message_success = "success";
          this.getConfigInfoList(res.data.data.conf_id);
          this.cancelConfigForm();
        } else {
          this.save_message = res.data.message;
          this.save_message_snack = true;
          this.save_message_success = "error";
        }
      }).catch((err) => {
        console.error(err);
        this.save_message = this.tm('configManagement.createFailed');
        this.save_message_snack = true;
        this.save_message_success = "error";
      });
    },
    onConfigSelect(value: string) {
      if (value === '_%manage%_') {
        this.configManageDialog = true;
        // 重置选择到之前的值
        this.$nextTick(() => {
          this.selectedConfigID = this.selectedConfigInfo.id || 'default';
        });
      } else {
        this.getConfig(value);
      }
    },
    startCreateConfig() {
      this.showConfigForm = true;
      this.isEditingConfig = false;
      this.configFormData = {
        name: '',
      };
      this.editingConfigId = null;
    },
    startEditConfig(config: ConfigInfo) {
      this.showConfigForm = true;
      this.isEditingConfig = true;
      this.editingConfigId = config.id;

      this.configFormData = {
        name: config.name || '',
      };
    },
    cancelConfigForm() {
      this.showConfigForm = false;
      this.isEditingConfig = false;
      this.editingConfigId = null;
      this.configFormData = {
        name: '',
      };
    },
    saveConfigForm() {
      if (!this.configFormData.name) {
        this.save_message = this.tm('configManagement.pleaseEnterName');
        this.save_message_snack = true;
        this.save_message_success = "error";
        return;
      }

      if (this.isEditingConfig) {
        this.updateConfigInfo();
      } else {
        this.createNewConfig();
      }
    },
    confirmDeleteConfig(config: ConfigInfo) {
      if (confirm(this.tm('configManagement.confirmDelete').replace('{name}', config.name))) {
        this.deleteConfig(config.id);
      }
    },
    deleteConfig(configId: string) {
      axios.post('/api/config/abconf/delete', {
        id: configId
      }).then((res) => {
        if (res.data.status === "ok") {
          this.save_message = res.data.message;
          this.save_message_snack = true;
          this.save_message_success = "success";
          this.cancelConfigForm();
          // 删除成功后，更新配置列表
          this.getConfigInfoList("default");
        } else {
          this.save_message = res.data.message;
          this.save_message_snack = true;
          this.save_message_success = "error";
        }
      }).catch((err) => {
        console.error(err);
        this.save_message = this.tm('configManagement.deleteFailed');
        this.save_message_snack = true;
        this.save_message_success = "error";
      });
    },
    updateConfigInfo() {
      axios.post('/api/config/abconf/update', {
        id: this.editingConfigId,
        name: this.configFormData.name
      }).then((res) => {
        if (res.data.status === "ok") {
          this.save_message = res.data.message;
          this.save_message_snack = true;
          this.save_message_success = "success";
          this.getConfigInfoList(this.editingConfigId);
          this.cancelConfigForm();
        } else {
          this.save_message = res.data.message;
          this.save_message_snack = true;
          this.save_message_success = "error";
        }
      }).catch((err) => {
        console.error(err);
        this.save_message = this.tm('configManagement.updateFailed');
        this.save_message_snack = true;
        this.save_message_success = "error";
      });
    },
    onConfigTypeToggle() {
      this.isSystemConfig = this.configType === 'system';
      this.fetched = false; // 重置加载状态

      if (this.isSystemConfig) {
        // 切换到系统配置
        this.getConfig();
      } else {
        // 切换回普通配置，如果有选中的配置文件则加载，否则加载default
        if (this.selectedConfigID) {
          this.getConfig(this.selectedConfigID);
        } else {
          this.getConfigInfoList("default");
        }
      }
    },
    onSystemConfigToggle() {
      // 保持向后兼容性，更新 configType
      this.configType = this.isSystemConfig ? 'system' : 'normal';

      this.fetched = false; // 重置加载状态

      if (this.isSystemConfig) {
        // 切换到系统配置
        this.getConfig();
      } else {
        // 切换回普通配置，如果有选中的配置文件则加载，否则加载default
        if (this.selectedConfigID) {
          this.getConfig(this.selectedConfigID);
        } else {
          this.getConfigInfoList("default");
        }
      }
    },
    openTestChat() {
      if (!this.selectedConfigID) {
        this.save_message = "请先选择一个配置文件";
        this.save_message_snack = true;
        this.save_message_success = "warning";
        return;
      }
      this.testConfigId = this.selectedConfigID;
      this.testChatDrawer = true;
    },
    closeTestChat() {
      this.testChatDrawer = false;
      this.testConfigId = null;
    }
  },
}

</script>

<style>
.v-tab {
  text-transform: none !important;
}

/* 按钮切换样式优化 */
.v-btn-toggle .v-btn {
  transition: all 0.3s ease !important;
}

.v-btn-toggle .v-btn:not(.v-btn--active) {
  opacity: 0.7;
}

.v-btn-toggle .v-btn.v-btn--active {
  opacity: 1;
  font-weight: 600;
}

/* 冲突消息样式 */
.text-warning code {
  background-color: rgba(255, 193, 7, 0.1);
  color: #e65100;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.text-warning strong {
  color: #f57c00;
}

.text-warning small {
  color: #6c757d;
  font-style: italic;
}

@media (min-width: 768px) {
  .config-panel {
    width: 750px;
  }
}

@media (max-width: 767px) {
  .v-container {
    padding: 4px;
  }

  .config-panel {
    width: 100%;
  }
}

/* 测试聊天抽屉样式 */
.test-chat-overlay {
  align-items: stretch;
  justify-content: flex-end;
}

.test-chat-card {
  width: clamp(320px, 50vw, 720px);
  height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  margin: 16px;
}

.test-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px 20px;
}

.test-chat-content {
  flex: 1;
  overflow: hidden;
  padding: 0;
  border-radius: 0 0 16px 16px;
}
</style>