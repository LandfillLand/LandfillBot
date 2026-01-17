<template>
  <v-dialog v-model="isOpen" max-width="400">
    <v-card>
      <v-card-title class="text-h6">{{ title }}</v-card-title>
      <v-card-text>{{ message }}</v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="gray" @click="handleCancel">{{ t('core.common.dialog.cancelButton') }}</v-btn>
        <v-btn color="red" @click="handleConfirm">{{ t('core.common.dialog.confirmButton') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from '@/i18n/composables';

const { t } = useI18n();

const isOpen = ref(false);
const title = ref("");
const message = ref("");
let resolvePromise: ((value: boolean) => void) | null = null;

const open = (options: { title?: string; message?: string } = {}): Promise<boolean> => {
  title.value = options.title || t('core.common.dialog.confirmTitle');
  message.value = options.message || t('core.common.dialog.confirmMessage');
  isOpen.value = true;

  return new Promise((resolve) => {
    resolvePromise = resolve;
  });
};

const handleConfirm = () => {
  isOpen.value = false;
  if (resolvePromise) resolvePromise(true);
  resolvePromise = null;
};

const handleCancel = () => {
  isOpen.value = false;
  if (resolvePromise) resolvePromise(false);
  resolvePromise = null;
};

defineExpose({ open });
</script>
