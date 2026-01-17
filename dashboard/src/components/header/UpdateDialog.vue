<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import { MarkdownRender, enableKatex, enableMermaid } from 'markstream-vue'
import 'markstream-vue/index.css'
import 'katex/dist/katex.min.css'
import { useI18n } from '@/i18n/composables'
import { useAuthStore } from '@/stores/auth'
import { useDisplay, useTheme } from 'vuetify'
import { shikiWasmReady } from '@/composables/shikiWasm'

type UpdateChannel = 'official' | 'nebula'

type UpdateTab = 'source' | 'dashboard'

type UpdateFlags = {
  hasNewVersion: boolean
  dashboardHasNewVersion: boolean
}

const props = defineProps<{
  modelValue: boolean
  botCurrVersion: string
  dashboardCurrentVersion: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'updateFlags', value: UpdateFlags): void
}>()

enableKatex()
enableMermaid()

const { t } = useI18n()

const display = useDisplay()

const theme = useTheme()
const isDark = computed(() => theme.global.current.value.dark)

// 高度过低时使用手机布局（即使是宽屏也切到“无侧栏”布局）
const isPhoneLayout = computed(() => display.xs.value || display.height.value < 720)

// 平板/手机或高度过低时强制全屏（避免内容被挤压/背后可滚动）
const isDialogFullscreen = computed(() => display.smAndDown.value || display.height.value < 720)

const sidebarWidth = computed(() => (display.sm.value ? 260 : 320))

const updateTab = ref<UpdateTab>('source')

const sourceUpdateChannel = ref<UpdateChannel>('official')
const dashboardUpdateChannel = ref<UpdateChannel>('official')

const updateChannelOptions = computed(() => [
  { title: t('core.header.updateDialog.channel.official'), value: 'official' as const },
  { title: t('core.header.updateDialog.channel.nebula'), value: 'nebula' as const }
])

const updateStatusKey = ref<string | null>(null)
const updateStatusText = ref('')
const lastCheckedAt = ref<Date | null>(null)

const hasNewVersion = ref(false)
const dashboardHasNewVersion = ref(false)

const installLoading = ref(false)
const updatingDashboardLoading = ref(false)

const releaseMessage = ref('')
const releases = ref<any[]>([])

const releasesHeader = computed(() => [
  { title: t('core.header.updateDialog.table.tag'), key: 'tag_name', sortable: false },
  { title: t('core.header.updateDialog.table.publishDate'), key: 'published_at', sortable: false },
  { title: t('core.header.updateDialog.table.sourceUrl'), key: 'zipball_url', sortable: false },
  { title: t('core.header.updateDialog.table.content'), key: 'body', sortable: false },
  { title: t('core.header.updateDialog.table.actions'), key: 'switch', sortable: false }
])

const activeHasNewVersion = computed(() => (updateTab.value === 'dashboard' ? dashboardHasNewVersion.value : hasNewVersion.value))
const displayUpdateStatus = computed(() => (updateStatusKey.value ? t(updateStatusKey.value) : updateStatusText.value))

function setUpdateStatusKey(key: string) {
  updateStatusKey.value = key
  updateStatusText.value = ''
}

function setUpdateStatusText(text: unknown) {
  updateStatusKey.value = null
  updateStatusText.value = typeof text === 'string' ? text : String(text)
}

const releaseNotesDialog = ref(false)
const releaseNotesTitle = ref('')
const releaseNotesContent = ref('')

function openReleaseNotesDialog(body: string, tagName: string) {
  releaseNotesTitle.value = tagName
  releaseNotesContent.value = body
  releaseNotesDialog.value = true
}

function isPreRelease(tagName: string) {
  return tagName.includes('-')
}

function onSourceChannelChanged() {
  releaseMessage.value = ''
  checkUpdate()
  getReleases()
}

async function checkUpdate() {
  setUpdateStatusKey('core.header.updateDialog.status.checking')
  try {
    const res = await axios.get('/api/update/check', {
      params: { channel: sourceUpdateChannel.value }
    })

    hasNewVersion.value = !!res.data.data.has_new_version
    dashboardHasNewVersion.value = !!res.data.data.dashboard_has_new_version

    emit('updateFlags', {
      hasNewVersion: hasNewVersion.value,
      dashboardHasNewVersion: dashboardHasNewVersion.value
    })

    if (hasNewVersion.value) {
      releaseMessage.value = res.data.message
      setUpdateStatusKey('core.header.version.hasNewVersion')
    } else {
      // 后端 message 可能是固定中文句子；这里用 i18n key，保证切换语言时能立即更新
      setUpdateStatusKey('core.header.updateDialog.dashboardUpdate.isLatest')
    }
  } catch (err: any) {
    if (err?.response && err.response.status == 401) {
      const authStore = useAuthStore()
      authStore.logout()
      return
    }
    setUpdateStatusText(err)
  } finally {
    lastCheckedAt.value = new Date()
  }
}

async function getReleases() {
  try {
    const res = await axios.get('/api/update/releases', {
      params: { channel: sourceUpdateChannel.value }
    })
    releases.value = (res.data.data || []).map((item: any) => {
      item.published_at = new Date(item.published_at).toLocaleString()
      return item
    })
  } catch (err) {
    console.log(err)
  }
}

async function switchVersion(tag: string) {
  setUpdateStatusKey('core.header.updateDialog.status.switching')
  installLoading.value = true
  try {
    const res = await axios.post('/api/update/do', {
      version: tag,
      proxy: localStorage.getItem('selectedGitHubProxy') || '',
      channel: sourceUpdateChannel.value
    })
    setUpdateStatusText(res.data.message)
    if (res.data.status == 'ok') {
      setTimeout(() => window.location.reload(), 1000)
    }
  } catch (err) {
    console.log(err)
    setUpdateStatusText(err)
  } finally {
    installLoading.value = false
  }
}

async function updateToLatestFromChannel() {
  setUpdateStatusKey('core.header.updateDialog.status.switching')
  installLoading.value = true
  try {
    const res = await axios.post('/api/update/do', {
      version: 'latest',
      proxy: localStorage.getItem('selectedGitHubProxy') || '',
      channel: sourceUpdateChannel.value
    })
    setUpdateStatusText(res.data.message)
    if (res.data.status == 'ok') {
      setTimeout(() => window.location.reload(), 1000)
    }
  } catch (err) {
    console.log(err)
    setUpdateStatusText(err)
  } finally {
    installLoading.value = false
  }
}

async function updateDashboard() {
  updatingDashboardLoading.value = true
  setUpdateStatusKey('core.header.updateDialog.status.updating')
  try {
    const res = await axios.post('/api/update/dashboard', {
      channel: dashboardUpdateChannel.value,
      proxy: localStorage.getItem('selectedGitHubProxy') || ''
    })
    setUpdateStatusText(res.data.message)
    if (res.data.status == 'ok') {
      setTimeout(() => window.location.reload(), 1000)
    }
  } catch (err) {
    console.log(err)
    setUpdateStatusText(err)
  } finally {
    updatingDashboardLoading.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      updateTab.value = 'source'
      checkUpdate()
      getReleases()
    }
  }
)

onMounted(() => {
  checkUpdate()
})

const dialogModel = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})
</script>

<template>
  <v-dialog
    v-model="dialogModel"
    :width="isDialogFullscreen ? '100%' : ($vuetify.display.smAndDown ? '100%' : '1100')"
    :fullscreen="isDialogFullscreen"
    :scrollable="isPhoneLayout"
    scroll-strategy="block"
    scroll-target="body"
    transition="dialog-bottom-transition"
  >
    <v-card
      class="update-dialog-card d-flex overflow-hidden"
      :class="[
        isPhoneLayout ? 'flex-column update-dialog-card--phone-layout' : 'flex-row',
        isDialogFullscreen ? 'update-dialog-card--fullscreen' : ''
      ]"
      :rounded="isDialogFullscreen ? 0 : undefined"
    >
      <v-sheet
        v-if="!isPhoneLayout"
        :width="sidebarWidth"
        class="flex-shrink-0 d-flex flex-column border-e"
        style="background-color: rgba(var(--v-theme-surface-variant), 0.05)"
      >
        <div class="pa-6">
          <div class="d-flex align-center mb-6">
            <v-avatar color="primary" rounded="md" size="64" class="mr-4">
              <v-icon size="42" color="white">mdi-autorenew</v-icon>
            </v-avatar>
            <div>
              <div class="text-subtitle-6 font-weight-bold text-uppercase text-medium-emphasis mb-1">
                {{ t('core.header.updateDialog.title') }}
              </div>
              <div class="text-body-2 text-medium-emphasis mb-1" style="line-height: 1.2">
                {{ t('core.header.updateDialog.tabs.source') }}: {{ props.botCurrVersion }}
              </div>
              <div class="text-body-2 text-medium-emphasis mb-1" style="line-height: 1.2">
                {{ t('core.header.updateDialog.tabs.dashboard') }}: {{ props.dashboardCurrentVersion }}
              </div>
            </div>
          </div>

          <v-divider class="mb-6" />

          <div class="d-flex flex-column gap-2">
            <v-btn
              :color="updateTab === 'source' ? 'primary' : undefined"
              :variant="updateTab === 'source' ? 'tonal' : 'text'"
              class="update-sidebar-btn justify-start px-4 text-none"
              height="48"
              prepend-icon="mdi-code-tags"
              @click="updateTab = 'source'"
            >
              {{ t('core.header.updateDialog.tabs.source') }}
            </v-btn>

            <v-btn
              :color="updateTab === 'dashboard' ? 'primary' : undefined"
              :variant="updateTab === 'dashboard' ? 'tonal' : 'text'"
              class="update-sidebar-btn justify-start px-4 text-none"
              height="48"
              prepend-icon="mdi-view-dashboard-outline"
              @click="updateTab = 'dashboard'"
            >
              {{ t('core.header.updateDialog.tabs.dashboard') }}
            </v-btn>
          </div>
        </div>

        <v-spacer />

        <div class="pa-6">
          <div class="text-caption font-weight-bold text-medium-emphasis mb-2 text-uppercase">
            {{ t('core.header.updateDialog.channel.label') }}
          </div>
          <v-select
            v-if="updateTab === 'source'"
            v-model="sourceUpdateChannel"
            :items="updateChannelOptions"
            item-title="title"
            item-value="value"
            variant="outlined"
            @update:model-value="onSourceChannelChanged"
          />
          <v-select
            v-if="updateTab === 'dashboard'"
            v-model="dashboardUpdateChannel"
            :items="updateChannelOptions"
            item-title="title"
            item-value="value"
            variant="outlined"
          />
        </div>
      </v-sheet>

      <div class="flex-grow-1 d-flex flex-column right-pane" style="min-width: 0">
        <div v-if="isPhoneLayout" class="pa-4 border-b d-flex align-center justify-space-between bg-surface">
          <span class="text-h5 font-weight-bold">{{ t('core.header.updateDialog.title') }}</span>
          <v-btn icon size="small" variant="text" @click="dialogModel = false"><v-icon>mdi-close</v-icon></v-btn>
        </div>

        <v-tabs
          v-if="isPhoneLayout"
          v-model="updateTab"
          color="primary"
          grow
          class="update-dialog-tabs"
          height="48"
        >
          <v-tab value="source">{{ t('core.header.updateDialog.tabs.source') }}</v-tab>
          <v-tab value="dashboard">{{ t('core.header.updateDialog.tabs.dashboard') }}</v-tab>
        </v-tabs>

        <div class="update-dialog-main">
          <v-window v-model="updateTab" class="update-dialog-window">
            <v-window-item value="source" class="update-dialog-window-item">
              <div class="update-pane">
                <template v-if="sourceUpdateChannel === 'official'">
                  <div class="update-pane__head">
                    <div class="d-flex align-center justify-space-between" style="gap: 12px">
                      <h3 class="text-h4 font-weight-bold">{{ t('core.header.updateDialog.channel.official') }}</h3>
                      <v-card v-if="!isPhoneLayout" border flat rounded="lg" class="pa-3 update-status-card">
                        <div class="d-flex align-center" style="gap: 12px">
                          <span class="font-weight-bold text-medium-emphasis update-status-text">{{ displayUpdateStatus }}</span>
                          <v-progress-circular
                            v-if="installLoading || updatingDashboardLoading"
                            indeterminate
                            color="primary"
                            size="20"
                            width="2"
                          />
                          <v-icon v-else :color="activeHasNewVersion ? 'warning' : 'success'" size="20">
                            {{ activeHasNewVersion ? 'mdi-alert-circle' : 'mdi-check-circle' }}
                          </v-icon>
                        </div>
                      </v-card>
                    </div>

                    <div
                      v-if="isPhoneLayout"
                      class="d-flex align-center justify-space-between mt-3 update-mobile-actions"
                      style="gap: 12px"
                    >
                      <v-card border flat rounded="lg" class="pa-3 update-status-card" style="min-width: 0">
                        <div class="d-flex align-center" style="gap: 12px; min-width: 0">
                          <span class="font-weight-bold text-medium-emphasis update-status-text">{{ displayUpdateStatus }}</span>
                          <v-progress-circular
                            v-if="installLoading || updatingDashboardLoading"
                            indeterminate
                            color="primary"
                            size="20"
                            width="2"
                          />
                          <v-icon v-else :color="activeHasNewVersion ? 'warning' : 'success'" size="20">
                            {{ activeHasNewVersion ? 'mdi-alert-circle' : 'mdi-check-circle' }}
                          </v-icon>
                        </div>
                      </v-card>

                      <v-select
                        v-model="sourceUpdateChannel"
                        :items="updateChannelOptions"
                        item-title="title"
                        item-value="value"
                        density="compact"
                        variant="outlined"
                        hide-details
                        style="max-width: 150px"
                        @update:model-value="onSourceChannelChanged"
                      />
                    </div>
                  </div>

                  <v-alert
                    v-if="releaseMessage"
                    color="info"
                    variant="tonal"
                    class="mb-6"
                    border="start"
                    closable
                    rounded="lg"
                  >
                    <div style="max-height: 200px; overflow-y: auto" class="text-body-2">
                      <MarkdownRender
                        :key="shikiWasmReady ? 'shiki' : 'pre'"
                        :content="releaseMessage"
                        :typewriter="false"
                        :is-dark="isDark"
                        :render-code-blocks-as-pre="false"
                        class="markdown-content"
                        :class="{ dark: isDark }"
                      />
                    </div>
                  </v-alert>

                  <div class="mb-4">
                    <small>{{ t('core.header.updateDialog.tip') }} {{ t('core.header.updateDialog.tipContinue') }}</small>
                  </div>

                  <div class="mb-4">
                    <small>
                      {{ t('core.header.updateDialog.dockerTip') }}
                      <a href="https://containrrr.dev/watchtower/usage-overview/">{{ t('core.header.updateDialog.dockerTipLink') }}</a>
                      {{ t('core.header.updateDialog.dockerTipContinue') }}
                    </small>
                  </div>

                  <v-alert
                    v-if="releases.some((item: any) => isPreRelease(item['tag_name']))"
                    type="warning"
                    variant="tonal"
                    border="start"
                    class="mb-4 update-pre-release-alert"
                    rounded="lg"
                  >
                    <template v-slot:prepend>
                      <v-icon>mdi-alert-circle-outline</v-icon>
                    </template>
                    <div class="text-body-2 update-pre-release-body">
                      <strong>{{ t('core.header.updateDialog.preReleaseWarning.title') }}</strong>
                      <br />
                      {{ t('core.header.updateDialog.preReleaseWarning.description') }}
                      <a href="https://github.com/AstrBotDevs/AstrBot/issues" target="_blank" class="text-decoration-none">
                        {{ t('core.header.updateDialog.preReleaseWarning.issueLink') }}
                      </a>
                    </div>
                  </v-alert>

                  <v-card border flat rounded="lg" class="releases-table-card">
                    <v-data-table
                      class="releases-table"
                      :headers="releasesHeader"
                      :items="releases"
                      item-key="name"
                      :items-per-page="5"
                      :fixed-header="!isPhoneLayout"
                      :height="isPhoneLayout ? undefined : '100%'"
                    >
                      <template v-slot:item.tag_name="{ item }: { item: any }">
                        <span class="font-weight-medium">{{ item.tag_name }}</span>
                        <v-chip
                          v-if="isPreRelease(item.tag_name)"
                          size="x-small"
                          color="warning"
                          variant="tonal"
                          class="ml-2"
                        >
                          {{ t('core.header.updateDialog.preRelease') }}
                        </v-chip>
                      </template>
                      <template v-slot:item.zipball_url="{ item }: { item: { zipball_url?: string } }">
                        <v-btn
                          v-if="item.zipball_url"
                          :href="item.zipball_url"
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="text"
                          size="small"
                          color="primary"
                          class="text-none"
                        >
                          {{ t('core.header.updateDialog.table.view') }}
                        </v-btn>
                        <span v-else class="text-medium-emphasis">-</span>
                      </template>
                      <template v-slot:item.body="{ item }: { item: { body: string; tag_name: string } }">
                        <v-btn
                          @click="openReleaseNotesDialog(item.body, item.tag_name)"
                          variant="text"
                          size="small"
                          color="primary"
                        >
                          {{ t('core.header.updateDialog.table.view') }}
                        </v-btn>
                      </template>
                      <template v-slot:item.switch="{ item }: { item: { tag_name: string } }">
                        <v-btn @click="switchVersion(item.tag_name)" variant="flat" size="small" color="primary" class="text-none">
                          {{ t('core.header.updateDialog.table.switch') }}
                        </v-btn>
                      </template>
                    </v-data-table>
                  </v-card>
                </template>

                <template v-else>
                  <div class="d-flex align-center justify-space-between mb-6" style="gap: 12px">
                    <div>
                      <h3 class="text-h4 font-weight-bold mb-1">{{ t('core.header.updateDialog.channel.nebula') }}</h3>
                      <div class="text-body-2 text-medium-emphasis">{{ t('core.header.updateDialog.channel.nebulaTip') }}</div>
                    </div>
                    <v-select
                      v-if="isPhoneLayout"
                      v-model="sourceUpdateChannel"
                      :items="updateChannelOptions"
                      item-title="title"
                      item-value="value"
                      density="compact"
                      variant="outlined"
                      hide-details
                      style="max-width: 150px"
                      @update:model-value="onSourceChannelChanged"
                    />
                  </div>

                  <v-card border flat class="d-flex flex-column flex-sm-row align-start align-sm-center pa-6">
                    <v-avatar color="primary" variant="tonal" size="64" class="mr-6 mb-4 mb-sm-0">
                      <v-icon size="32">mdi-git</v-icon>
                    </v-avatar>
                    <div class="flex-grow-1 mr-4">
                      <div class="text-h4 font-weight-bold mb-1">{{ t('core.header.updateDialog.channel.updateLatest') }}</div>
                      <div class="text-body-1 text-medium-emphasis mb-2">
                        {{ t('core.header.updateDialog.channel.nebulaTip') }}
                      </div>
                      <div v-if="lastCheckedAt" class="text-caption text-medium-emphasis">
                        {{ lastCheckedAt.toLocaleString() }}
                      </div>
                    </div>
                    <div class="mt-4 mt-sm-0 flex-shrink-0">
                      <v-btn
                        size="large"
                        color="primary"
                        prepend-icon="mdi-cloud-download"
                        @click="updateToLatestFromChannel"
                        :loading="installLoading"
                        elevation="1"
                      >
                        {{ t('core.header.updateDialog.channel.updateLatest') }}
                      </v-btn>
                    </div>
                  </v-card>
                </template>
              </div>
            </v-window-item>

            <v-window-item value="dashboard" class="update-dialog-window-item">
              <div class="update-pane">
                <div class="update-pane__head">
                  <div class="d-flex align-center justify-space-between" style="gap: 12px">
                    <h3 class="text-h4 font-weight-bold">{{ t('core.header.updateDialog.tabs.dashboard') }}</h3>
                  </div>

                  <div
                    v-if="isPhoneLayout"
                    class="d-flex align-center justify-space-between mt-3 update-mobile-actions"
                    style="gap: 12px"
                  >
                    <v-select
                      v-model="dashboardUpdateChannel"
                      :items="updateChannelOptions"
                      item-title="title"
                      item-value="value"
                      density="compact"
                      variant="outlined"
                      hide-details
                      style="max-width: 150px"
                    />
                  </div>
                </div>

                <v-card border flat class="pa-6 dashboard-update-card">
                  <div class="dashboard-update-top">
                    <div class="dashboard-update-label">
                      <div class="text-body-4 text-medium-emphasis font-weight-bold mb-0">
                        {{ t('core.header.updateDialog.dashboardUpdate.currentVersion') }}
                      </div>
                      <v-chip
                        v-if="dashboardHasNewVersion"
                        color="warning"
                        rounded="lg"
                        label
                        size="small"
                        class="dashboard-update-status-chip"
                      >
                        {{ t('core.header.updateDialog.dashboardUpdate.hasNewVersion') }}
                      </v-chip>
                      <v-chip
                        v-else
                        color="success"
                        rounded="lg"
                        label
                        size="small"
                        class="dashboard-update-status-chip"
                      >
                        {{ t('core.header.updateDialog.dashboardUpdate.isLatest') }}
                      </v-chip>
                    </div>

                    <v-btn
                      color="primary"
                      min-width="120"
                      prepend-icon="mdi-update"
                      @click="updateDashboard()"
                      :loading="updatingDashboardLoading"
                      :block="$vuetify.display.xs"
                      class="dashboard-update-btn"
                    >
                      {{ t('core.header.updateDialog.dashboardUpdate.downloadAndUpdate') }}
                    </v-btn>
                  </div>
                </v-card>
              </div>
            </v-window-item>
          </v-window>
        </div>

        <div v-if="!isPhoneLayout" class="pa-4 border-t d-flex justify-end bg-surface">
          <v-btn color="medium-emphasis" variant="text" size="large" @click="dialogModel = false">
            {{ t('core.common.close') }}
          </v-btn>
        </div>
      </div>
    </v-card>
  </v-dialog>

  <v-dialog v-model="releaseNotesDialog" max-width="800">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between px-6 py-4">
        <span class="text-h6 font-weight-medium">
          {{ t('core.header.updateDialog.releaseNotes.title') }}: {{ releaseNotesTitle }}
        </span>
        <v-btn icon="mdi-close" variant="text" @click="releaseNotesDialog = false" />
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6" style="font-size: 16px; max-height: 500px; overflow-y: auto; line-height: 1.6">
        <MarkdownRender
          :key="shikiWasmReady ? 'shiki' : 'pre'"
          :content="releaseNotesContent"
          :typewriter="false"
          :is-dark="isDark"
          :render-code-blocks-as-pre="false"
          class="markdown-content"
          :class="{ dark: isDark }"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.update-dialog-card {
  height: 75vh;
  min-height: 75vh;
  max-height: 75vh;
}

.update-dialog-card--fullscreen {
  height: 100vh;
  max-height: 100vh;
  border-radius: 0 !important;
}

@supports (height: 100dvh) {
  .update-dialog-card--fullscreen {
    height: 100dvh;
    max-height: 100dvh;
  }
}

.right-pane {
  min-height: 0;
}

.update-dialog-tabs {
  flex: 0 0 auto;
  background: rgb(var(--v-theme-surface));
}

.update-dialog-tabs :deep(.v-slide-group__container),
.update-dialog-tabs :deep(.v-slide-group__content),
.update-dialog-tabs :deep(.v-slide-group__content > .v-slide-group-item) {
  height: 48px;
  min-height: 48px;
}

.update-dialog-main {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 24px;
}

.update-dialog-window,
.update-dialog-window-item {
  height: 100%;
}

.update-pane {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.update-pane__head {
  flex: 0 0 auto;
  margin-bottom: 16px;
}

/* 桌面端：仅表格区域滚动 */
.releases-table-card {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.releases-table {
  height: 100%;
}

.update-status-card {
  width: fit-content;
  max-width: 100%; 
  white-space: nowrap; 
}

.update-status-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.update-pre-release-alert .v-alert__content) {
  min-height: auto;
}

.update-pre-release-alert {
  flex: 0 0 auto;
  align-self: flex-start;
  max-height: 240px;
  overflow: hidden;
}

:deep(.update-pre-release-alert .v-alert__content) {
  overflow: hidden;
  align-items: flex-start;
}

:deep(.update-pre-release-alert .v-alert__prepend) {
  align-self: flex-start;
}

.update-pre-release-body {
  max-height: 180px;
  overflow-y: auto;
}

.dashboard-update-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.dashboard-update-label {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.dashboard-update-status-chip {
  height: 25px;
}

@media (max-width: 600px) {
  /* 移动端：内容区整体滚动，表格自然撑开，并保证底部留白 */
  .update-dialog-main {
    overflow-y: auto;
    padding: 16px;
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
  }

  .update-dialog-window,
  .update-dialog-window-item {
    height: auto;
  }

  .update-pane {
    height: auto;
    min-height: auto;
  }

  .releases-table-card {
    flex: 0 0 auto;
    overflow: visible;
  }

  .releases-table {
    height: auto;
  }

  .dashboard-update-btn {
    width: 100%;
  }
  .update-mobile-actions {
    align-items: stretch;
  }

  .update-mobile-actions .update-status-card {
    height: 40px;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    display: flex;
    align-items: center;
  }

  :deep(.update-mobile-actions .v-field) {
    height: 40px;
  }

  :deep(.update-mobile-actions .v-field__input) {
    min-height: 40px;
    padding-top: 0;
    padding-bottom: 0;
    display: flex;
    align-items: center;
  }
}

/* 低高度触发的“手机布局”（宽屏也生效） */
.update-dialog-card--phone-layout .update-dialog-main {
  overflow-y: auto;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.update-dialog-card--phone-layout .update-dialog-window,
.update-dialog-card--phone-layout .update-dialog-window-item {
  height: auto;
}

.update-dialog-card--phone-layout .update-pane {
  height: auto;
  min-height: auto;
}

.update-dialog-card--phone-layout .releases-table-card {
  flex: 0 0 auto;
  overflow: visible;
}

.update-dialog-card--phone-layout .releases-table {
  height: auto;
}

.update-dialog-card--phone-layout .dashboard-update-btn {
  width: 100%;
}

/* Use neutral gray borders (avoid accent/theme-primary borders) */
:deep(.update-dialog-card .border-e),
:deep(.update-dialog-card .border-b),
:deep(.update-dialog-card .border-t),
:deep(.update-dialog-card .v-card--border) {
  border-color: rgba(var(--v-theme-on-surface), 0.12) !important;
}

.gap-2 {
  gap: 8px;
}

.no-wrap {
  white-space: nowrap;
}

:deep(.update-sidebar-btn) {
  color: rgba(var(--v-theme-on-surface), 0.7);
}

:deep(.update-sidebar-btn:hover) {
  color: rgb(var(--v-theme-primary));
}
</style>
