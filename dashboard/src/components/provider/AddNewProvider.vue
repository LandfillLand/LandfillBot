<template>
    <v-dialog v-model="showDialog" max-width="1100px" min-height="95%">
        <v-card class="dialog-card" :class="{ 'is-dark': isDark }" :title="tm('dialogs.addProvider.title')">
            <template v-slot:append>
                <v-btn icon="mdi-close" variant="text" @click="closeDialog"></v-btn>
            </template>

            <v-card-text class="pa-4" style="overflow-y: auto;">
                <v-tabs v-model="activeProviderTab" grow color="primary" align-tabs="center">
                    <v-tab value="agent_runner" class="font-weight-medium px-3 rounded-t-lg">
                        <v-icon start>mdi-cogs</v-icon>
                        {{ tm('dialogs.addProvider.tabs.agentRunner') }}
                    </v-tab>
                    <v-tab value="speech_to_text" class="font-weight-medium px-3 rounded-t-lg">
                        <v-icon start>mdi-microphone-message</v-icon>
                        {{ tm('dialogs.addProvider.tabs.speechToText') }}
                    </v-tab>
                    <v-tab value="text_to_speech" class="font-weight-medium px-3 rounded-t-lg">
                        <v-icon start>mdi-volume-high</v-icon>
                        {{ tm('dialogs.addProvider.tabs.textToSpeech') }}
                    </v-tab>
                    <v-tab value="embedding" class="font-weight-medium px-3 rounded-t-lg">
                        <v-icon start>mdi-code-json</v-icon>
                        {{ tm('dialogs.addProvider.tabs.embedding') }}
                    </v-tab>
                    <v-tab value="rerank" class="font-weight-medium px-3 rounded-t-lg">
                        <v-icon start>mdi-compare-vertical</v-icon>
                        {{ tm('dialogs.addProvider.tabs.rerank') }}
                    </v-tab>
                </v-tabs>

                <v-divider></v-divider>

                <v-window v-model="activeProviderTab" class="mt-6 provider-window">
                    <v-window-item
                        v-for="tabType in ['chat_completion', 'agent_runner', 'speech_to_text', 'text_to_speech', 'embedding', 'rerank']"
                        :key="tabType" :value="tabType">
                        <v-row>
                            <v-col v-for="(template, name) in getTemplatesByType(tabType)" :key="name" cols="12" sm="6"
                                md="4">
                                <v-card class="provider-card" elevation="0"
                                    @click="selectProviderTemplate(name)">
                                    <div class="provider-card-content">
                                        <div class="provider-card-text">
                                            <v-card-title class="provider-card-title">
                                                {{ name }}
                                            </v-card-title>
                                            <v-card-text class="provider-card-description text-body-2 text-medium-emphasis">
                                                {{ getProviderDescription(template, name) }}
                                            </v-card-text>
                                        </div>
                                        <div class="provider-card-logo">
                                            <img :src="getProviderIcon(template.provider)"
                                                v-if="getProviderIcon(template.provider)" class="provider-logo-img">
                                            <div v-else class="provider-logo-fallback">
                                                {{ name[0].toUpperCase() }}
                                            </div>
                                        </div>
                                    </div>
                                </v-card>
                            </v-col>
                            <v-col v-if="Object.keys(getTemplatesByType(tabType)).length === 0" cols="12">
                                <v-alert type="info" variant="tonal" border="start" class="mt-2">
                                    {{ tm('dialogs.addProvider.noTemplates') }}
                                </v-alert>
                            </v-col>
                        </v-row>
                    </v-window-item>
                </v-window>
            </v-card-text>
            <v-card-actions class="pa-4 pt-0">
                <v-spacer></v-spacer>
                <v-btn variant="text" color="medium-emphasis" @click="closeDialog">
                    {{ tm('dialogs.config.cancel') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import { computed } from 'vue';
import { useTheme } from 'vuetify';
import { useModuleI18n } from '@/i18n/composables';
import { getProviderIcon, getProviderDescription, type ProviderTemplate } from '@/utils/providerUtils';

export default {
    name: 'AddNewProvider',
    props: {
        show: {
            type: Boolean,
            default: false
        },
        metadata: {
            type: Object,
            default: () => ({})
        }
    },
    emits: ['update:show', 'select-template'],
    setup() {
        const { tm } = useModuleI18n('features/provider');
        const theme = useTheme();
        const isDark = computed(() => theme.global.current.value.dark);

        return { tm, isDark };
    },
    data() {
        return {
            activeProviderTab: 'chat_completion'
        };
    },
    computed: {
        showDialog: {
            get() {
                return this.show;
            },
            set(value: boolean) {
                this.$emit('update:show', value);
            }
        },
    },
    methods: {
        closeDialog() {
            this.showDialog = false;
        },

        getTemplatesByType(type: string) {
            const templates = (this.metadata as any)?.provider?.config_template || {};
            const filtered: Record<string, any> = {};

            for (const [name, template] of Object.entries(templates as Record<string, any>)) {
                const tpl = template as any;
                if (tpl?.provider_type === type) {
                    filtered[name] = tpl;
                }
            }

            return filtered;
        },

        getProviderIcon,

        getProviderDescription(template: ProviderTemplate, name: string) {
            return getProviderDescription(template, name, this.tm);
        },

        selectProviderTemplate(name: string) {
            this.$emit('select-template', name);
            this.closeDialog();
        }
    }
}
</script>

<style scoped>
.provider-window {
    padding-top: 8px;
}

.provider-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 3px solid rgba(var(--v-theme-border), var(--v-theme-border-opacity, 1));
    color: rgba(var(--v-theme-primaryText));
    opacity: 0.8;
    border-radius: 12px;
    height: 100%;
    cursor: pointer;
    overflow: hidden;
    position: relative;
    background-color: rgb(var(--v-theme-surface));
}

.provider-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 20px -8px rgba(var(--v-theme-primary), 0.15);
    color: rgba(var(--v-theme-primary));
    opacity: 1;
    border-color: rgb(var(--v-theme-primary));
}

.provider-card-content {
    display: flex;
    align-items: center;
    height: 110px;
    padding: 20px;
    position: relative;
    z-index: 2;
}

.provider-card-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-right: 60px;
}

.provider-card-title {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 6px;
    padding: 0;
    line-height: 1.2;
}

.provider-card-description {
    padding: 0;
    margin: 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.provider-card-logo {
    position: absolute;
    right: -10px;
    bottom: -10px;
    width: 90px;
    height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    pointer-events: none;
}

.provider-logo-img {
    width: 100%;
    height: 100%;
    opacity: 0.15;
    object-fit: contain;
    transform: rotate(-15deg);
    transition: all 0.3s ease;
    filter: grayscale(100%);
}

.dialog-card.is-dark .provider-logo-img {
    filter: grayscale(100%) invert(1);
    opacity: 0.2;
}

.provider-card:hover .provider-logo-img {
    opacity: 0.3;
    transform: rotate(0deg) scale(1.1);
    filter: grayscale(0%);
}

.dialog-card.is-dark .provider-card:hover .provider-logo-img {
    filter: grayscale(0%) invert(1);
    opacity: 0.4;
}

.provider-logo-fallback {
    width: 60px;
    height: 60px;
    border-radius: 16px;
    background-color: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 800;
    transform: rotate(-10deg);
}
</style>