<template>
    <div class="persona-page">
        <v-container fluid class="pa-0">
            <v-row class="d-flex justify-space-between align-center px-4 py-3 pb-8">
                <div>
                    <h1 class="text-h1 font-weight-bold mb-2">
                        <v-icon color="black" class="me-2">mdi-heart</v-icon>{{ t('core.navigation.persona') }}
                    </h1>
                    <p class="text-subtitle-1 text-medium-emphasis mb-4">
                        {{ tm('page.description') }}
                    </p>
                </div>
                <div>
                    <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openCreateDialog"
                        rounded="xl" size="x-large">
                        {{ tm('buttons.create') }}
                    </v-btn>
                </div>
            </v-row>

            <v-row v-if="!loading">
                <v-col v-for="persona in personas" :key="persona.persona_id" cols="12" md="6" lg="4" xl="3">
                    <item-card 
                        :item="persona" 
                        title-field="persona_id" 
                        :show-switch="false"
                        title-class="text-h3"
                        @click="viewPersona(persona)" 
                        @edit="editPersona" 
                        @delete="deletePersona"
                        class="persona-card-fixed"
                    >
                        <template #item-details="{ item }">
                            <div class="content-container">
                                <div class="system-prompt-preview mb-2">
                                    {{ truncateText(item.system_prompt, 100) }}
                                </div>

                                <div class="tags-container">
                                    <v-chip v-if="item.begin_dialogs && item.begin_dialogs.length > 0" size="small"
                                        color="secondary" variant="tonal" prepend-icon="mdi-chat">
                                        {{ tm('labels.presetDialogs', { count: item.begin_dialogs.length / 2 }) }}
                                    </v-chip>
                                </div>
                            </div>
                        </template>

                        <template #footer-start="{ item }">
                            <v-tooltip location="bottom" open-delay="300">
                                <template v-slot:activator="{ props }">
                                    <div v-bind="props" class="text-caption text-medium-emphasis ms-2 d-flex align-center cursor-help">
                                        <v-icon size="small" start class="me-1">mdi-clock-outline</v-icon>
                                        {{ formatDate(item.created_at).split(' ')[0] }}
                                    </div>
                                </template>
                                <span>{{ tm('labels.createdAt') }}: {{ formatDate(item.created_at) }}</span>
                            </v-tooltip>
                        </template>

                    </item-card>
                </v-col>

                <v-col v-if="personas.length === 0" cols="12">
                    <v-card class="text-center pa-8" elevation="0">
                        <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-group</v-icon>
                        <h3 class="text-h5 mb-2">{{ tm('empty.title') }}</h3>
                        <p class="text-body-1 text-medium-emphasis mb-4">{{ tm('empty.description') }}</p>
                        <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openCreateDialog">
                            {{ tm('buttons.createFirst') }}
                        </v-btn>
                    </v-card>
                </v-col>
            </v-row>

            <v-row v-if="loading">
                <v-col v-for="n in 6" :key="n" cols="12" md="6" lg="4" xl="3">
                    <v-skeleton-loader 
                        class="border"
                        type="heading, text@3, actions" 
                        rounded="xl" 
                        height="240"
                    ></v-skeleton-loader>
                </v-col>
            </v-row>
        </v-container>

        <PersonaForm v-model="showPersonaDialog" :editing-persona="editingPersona" @saved="handlePersonaSaved"
            @error="showError" />

        <v-dialog v-model="showViewDialog" max-width="700px">
            <v-card v-if="viewingPersona">
                <v-card-title class="d-flex justify-space-between align-center">
                    <span class="text-h5">{{ viewingPersona.persona_id }}</span>
                    <v-btn icon="mdi-close" variant="text" @click="showViewDialog = false" />
                </v-card-title>

                <v-card-text>
                    <div class="mb-4">
                        <h4 class="text-h6 mb-2">{{ tm('form.systemPrompt') }}</h4>
                        <pre class="system-prompt-content">{{ viewingPersona.system_prompt }}</pre>
                    </div>

                    <div v-if="viewingPersona.begin_dialogs && viewingPersona.begin_dialogs.length > 0" class="mb-4">
                        <h4 class="text-h6 mb-2">{{ tm('form.presetDialogs') }}</h4>
                        <div v-for="(dialog, index) in viewingPersona.begin_dialogs" :key="index" class="mb-2">
                            <v-chip :color="Number(index) % 2 === 0 ? 'primary' : 'secondary'" variant="tonal" size="small"
                                class="mb-1">
                                {{ Number(index) % 2 === 0 ? tm('form.userMessage') : tm('form.assistantMessage') }}
                            </v-chip>
                            <div class="dialog-content ml-2">
                                {{ dialog }}
                            </div>
                        </div>
                    </div>

                    <div class="mb-4">
                        <h4 class="text-h6 mb-2">{{ tm('form.tools') }}</h4>
                        <div v-if="viewingPersona.tools === null" class="text-body-2 text-medium-emphasis">
                            <v-chip size="small" color="success" variant="tonal" prepend-icon="mdi-check-all">
                                {{ tm('form.allToolsAvailable') }}
                            </v-chip>
                        </div>
                        <div v-else-if="viewingPersona.tools && viewingPersona.tools.length > 0"
                            class="d-flex flex-wrap ga-1">
                            <v-chip v-for="toolName in viewingPersona.tools" :key="toolName" size="small"
                                color="primary" variant="tonal">
                                {{ toolName }}
                            </v-chip>
                        </div>
                        <div v-else class="text-body-2 text-medium-emphasis">
                            {{ tm('form.noToolsSelected') }}
                        </div>
                    </div>

                    <div class="text-caption text-medium-emphasis">
                        <div>{{ tm('labels.createdAt') }}: {{ formatDate(viewingPersona.created_at) }}</div>
                        <div v-if="viewingPersona.updated_at">{{ tm('labels.updatedAt') }}: {{
                            formatDate(viewingPersona.updated_at) }}</div>
                    </div>
                </v-card-text>
            </v-card>
        </v-dialog>

        <v-snackbar :timeout="3000" elevation="24" :color="messageType" v-model="showMessage" location="top">
            {{ message }}
        </v-snackbar>
    </div>
</template>

<script lang="ts">
import axios from 'axios';
import { useI18n, useModuleI18n } from '@/i18n/composables';
import PersonaForm from '@/components/shared/PersonaForm.vue';
import ItemCard from '@/components/shared/ItemCard.vue';

type Persona = {
    persona_id: string;
    system_prompt: string;
    begin_dialogs?: string[];
    tools: string[] | null;
    created_at: string;
    updated_at?: string | null;
};

export default {
    name: 'PersonaPage',
    components: {
        PersonaForm,
        ItemCard
    },
    setup() {
        const { t } = useI18n();
        const { tm } = useModuleI18n('features/persona');
        return { t, tm };
    },
    data() {
        return {
            personas: [] as Persona[],
            loading: false,
            showPersonaDialog: false,
            showViewDialog: false,
            editingPersona: null as Persona | null,
            viewingPersona: null as Persona | null,
            showMessage: false,
            message: '',
            messageType: 'success'
        }
    },

    mounted() {
        this.loadPersonas();
    },

    methods: {
        async loadPersonas() {
            this.loading = true;
            // Prevent Loading Flicker: ensure loading state lasts at least 500ms
            const minTime = new Promise(resolve => setTimeout(resolve, 500));

            try {
                const [_, response] = await Promise.all([
                    minTime,
                    axios.get('/api/persona/list')
                ]);

                if (response.data.status === 'ok') {
                    const raw = (response.data.data || []) as Array<Record<string, unknown>>;
                    this.personas = raw.map((p) => {
                        const beginDialogs = Array.isArray(p.begin_dialogs) ? (p.begin_dialogs as string[]) : undefined;
                        const tools = p.tools === null ? null : (Array.isArray(p.tools) ? (p.tools as string[]) : []);
                        return {
                            persona_id: String(p.persona_id ?? ''),
                            system_prompt: String(p.system_prompt ?? ''),
                            begin_dialogs: beginDialogs,
                            tools,
                            created_at: String(p.created_at ?? ''),
                            updated_at: p.updated_at == null ? null : String(p.updated_at)
                        } as Persona;
                    });
                } else {
                    this.showError(response.data.message || this.tm('messages.loadError'));
                }
            } catch (error) {
                const message = axios.isAxiosError(error)
                    ? (error.response?.data?.message || error.message)
                    : (error instanceof Error ? error.message : undefined);
                this.showError(message || this.tm('messages.loadError'));
            } finally {
                this.loading = false;
            }
        },

        openCreateDialog() {
            this.editingPersona = null;
            this.showPersonaDialog = true;
        },

        editPersona(persona: Persona) {
            this.editingPersona = persona;
            this.showPersonaDialog = true;
        },

        viewPersona(persona: Persona) {
            this.viewingPersona = persona;
            this.showViewDialog = true;
        },

        handlePersonaSaved(message: string) {
            this.showSuccess(message);
            this.loadPersonas();
        },

        async deletePersona(persona: Persona) {
            if (!confirm(this.tm('messages.deleteConfirm', { id: persona.persona_id }))) {
                return;
            }

            try {
                const response = await axios.post('/api/persona/delete', {
                    persona_id: persona.persona_id
                });

                if (response.data.status === 'ok') {
                    this.showSuccess(response.data.message || this.tm('messages.deleteSuccess'));
                    await this.loadPersonas();
                } else {
                    this.showError(response.data.message || this.tm('messages.deleteError'));
                }
            } catch (error) {
                const message = axios.isAxiosError(error)
                    ? (error.response?.data?.message || error.message)
                    : (error instanceof Error ? error.message : undefined);
                this.showError(message || this.tm('messages.deleteError'));
            }
        },

        truncateText(text: string, maxLength: number) {
            if (!text) return '';
            return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
        },

        formatDate(dateString: string) {
            if (!dateString) return '';
            return new Date(dateString).toLocaleString();
        },

        showSuccess(message: string) {
            this.message = message;
            this.messageType = 'success';
            this.showMessage = true;
        },

        showError(message: string) {
            this.message = message;
            this.messageType = 'error';
            this.showMessage = true;
        }
    }
}
</script>

<style scoped>
.persona-page {
    padding: 20px;
    padding-top: 8px;
}

.persona-card-fixed {
    height: 240px !important;
    max-height: 240px !important;
    min-height: 240px !important;
    cursor: pointer;
}

.content-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 8px 12px; 
}

.system-prompt-preview {
    font-size: 13px;
    line-height: 1.4;
    color: rgba(var(--v-theme-on-surface), 0.75);
    word-break: break-all;
    white-space: normal;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    height: 54px; 
}

.tags-container {
    height: 20px;
    display: flex;
    align-items: center;
    overflow: hidden;
}

.system-prompt-content {
    max-height: 400px;
    overflow: auto;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
}

.dialog-content {
    background-color: rgba(var(--v-theme-surface-variant), 0.3);
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.4;
    margin-bottom: 8px;
    white-space: pre-wrap;
    word-break: break-word;
}
</style>