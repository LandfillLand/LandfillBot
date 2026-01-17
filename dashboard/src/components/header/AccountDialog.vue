<script setup lang="ts">
import { computed, ref } from 'vue'
import axios from 'axios'
import { md5 } from 'js-md5'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/i18n/composables'
import Logo from '@/components/shared/Logo.vue'
import { useDisplay } from 'vuetify'

const props = defineProps<{
  modelValue: boolean
  warning: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const display = useDisplay()
const { t } = useI18n()

const username = localStorage.getItem('user')

const password = ref('')
const newPassword = ref('')
const newUsername = ref('')

const formValid = ref(true)

const passwordRules = computed(() => [
  (v: string) => !!v || t('core.header.accountDialog.validation.passwordRequired'),
  (v: string) => v.length >= 8 || t('core.header.accountDialog.validation.passwordMinLength')
])

const usernameRules = computed(() => [
  (v: string) => !v || v.length >= 3 || t('core.header.accountDialog.validation.usernameMinLength')
])

const showPassword = ref(false)
const showNewPassword = ref(false)

const accountEditStatus = ref({
  loading: false,
  success: false,
  error: false,
  message: ''
})

const dialogModel = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})

async function accountEdit() {
  accountEditStatus.value.loading = true
  accountEditStatus.value.error = false
  accountEditStatus.value.success = false

  const payloadPassword = password.value ? md5(password.value) : ''
  const payloadNewPassword = newPassword.value ? md5(newPassword.value) : ''

  try {
    const res = await axios.post('/api/auth/account/edit', {
      password: payloadPassword,
      new_password: payloadNewPassword,
      new_username: newUsername.value ? newUsername.value : username
    })

    if (res.data.status == 'error') {
      accountEditStatus.value.error = true
      accountEditStatus.value.message = res.data.message
      password.value = ''
      newPassword.value = ''
      return
    }

    accountEditStatus.value.success = true
    accountEditStatus.value.message = res.data.message

    setTimeout(() => {
      dialogModel.value = false
      const authStore = useAuthStore()
      authStore.logout()
    }, 2000)
  } catch (err) {
    console.log(err)
    accountEditStatus.value.error = true
    accountEditStatus.value.message = typeof err === 'string' ? err : t('core.header.accountDialog.messages.updateFailed')
    password.value = ''
    newPassword.value = ''
  } finally {
    accountEditStatus.value.loading = false
  }
}
</script>

<template>
  <v-dialog v-model="dialogModel" persistent :max-width="display.xs.value ? '90%' : '500'">
    <v-card class="account-dialog">
      <v-card-text class="py-6">
        <div class="d-flex flex-column align-center mb-6">
          <Logo :title="t('core.header.logoTitle')" :subtitle="t('core.header.accountDialog.title')" />
        </div>

        <v-alert v-if="warning" type="warning" variant="tonal" border="start" class="mb-4">
          <strong>{{ t('core.header.accountDialog.securityWarning') }}</strong>
        </v-alert>

        <v-alert v-if="accountEditStatus.success" type="success" variant="tonal" border="start" class="mb-4">
          {{ accountEditStatus.message }}
        </v-alert>

        <v-alert v-if="accountEditStatus.error" type="error" variant="tonal" border="start" class="mb-4">
          {{ accountEditStatus.message }}
        </v-alert>

        <v-form v-model="formValid" @submit.prevent="accountEdit">
          <v-text-field
            v-model="password"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            :type="showPassword ? 'text' : 'password'"
            :label="t('core.header.accountDialog.form.currentPassword')"
            variant="outlined"
            required
            clearable
            @click:append-inner="showPassword = !showPassword"
            prepend-inner-icon="mdi-lock-outline"
            hide-details="auto"
            class="mb-4"
          />

          <v-text-field
            v-model="newPassword"
            :append-inner-icon="showNewPassword ? 'mdi-eye-off' : 'mdi-eye'"
            :type="showNewPassword ? 'text' : 'password'"
            :rules="passwordRules"
            :label="t('core.header.accountDialog.form.newPassword')"
            variant="outlined"
            required
            clearable
            @click:append-inner="showNewPassword = !showNewPassword"
            prepend-inner-icon="mdi-lock-plus-outline"
            :hint="t('core.header.accountDialog.form.passwordHint')"
            persistent-hint
            class="mb-4"
          />

          <v-text-field
            v-model="newUsername"
            :rules="usernameRules"
            :label="t('core.header.accountDialog.form.newUsername')"
            variant="outlined"
            clearable
            prepend-inner-icon="mdi-account-edit-outline"
            :hint="t('core.header.accountDialog.form.usernameHint')"
            persistent-hint
            class="mb-3"
          />
        </v-form>

        <div class="text-caption text-medium-emphasis mt-2">
          {{ t('core.header.accountDialog.form.defaultCredentials') }}
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn v-if="!warning" variant="tonal" color="secondary" @click="dialogModel = false" :disabled="accountEditStatus.loading">
          {{ t('core.header.accountDialog.actions.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          @click="accountEdit"
          :loading="accountEditStatus.loading"
          :disabled="!formValid"
          prepend-icon="mdi-content-save"
        >
          {{ t('core.header.accountDialog.actions.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style>
.account-dialog .v-card-text {
  padding-top: 24px;
  padding-bottom: 24px;
}

.account-dialog .v-alert {
  margin-bottom: 20px;
}

.account-dialog .v-btn {
  text-transform: none;
  font-weight: 500;
  border-radius: 8px;
}

.account-dialog .v-avatar {
  transition: transform 0.3s ease;
}

.account-dialog .v-avatar:hover {
  transform: scale(1.05);
}
</style>
