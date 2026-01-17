<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from '@/i18n/composables';

const router = useRouter();
const { t } = useI18n();

const goBack = () => {
  router.go(-1);
};
</script>

<template>
  <v-container class="error-container d-flex align-center justify-center fill-height">
    <div class="text-center">
      <div class="mb-10 d-flex align-center justify-center error-header">
        <v-icon 
          size="120" 
          color="primary" 
          class="error-icon animation-float mr-4" 
          style="opacity: 0.8;"
        >
          mdi-robot-confused-outline
        </v-icon>

        <h1 class="text-h1 font-weight-black text-primary gradient-text">
            404
        </h1>
      </div>

      <div class="d-flex justify-center align-center action-buttons">
        <v-btn
          color="primary"
          size="x-large"
          variant="flat"
          rounded="sm"
          prepend-icon="mdi-home"
          to="/"
          elevation="4"
          class="px-4 px-sm-8" 
        >
          {{ t('core.common.error404.returnHome') }}
        </v-btn>

        <v-btn
          variant="outlined"
          size="x-large"
          color="primary"
          rounded="sm"
          prepend-icon="mdi-arrow-left"
          @click="goBack"
          class="px-4 px-sm-8"
        >
          {{ t('core.common.error404.goBack') }}
        </v-btn>
      </div>
    </div>
  </v-container>
</template>

<style scoped>
.error-container {
  min-height: 80vh;
}

.action-buttons {
  gap: 16px;
}

.gradient-text {
  background: linear-gradient(45deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-secondary, var(--v-theme-primary))));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-size: 8rem !important;
  line-height: 1;
}

.animation-float {
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
}

@media (max-width: 600px) {
  .error-header {
    flex-direction: column;
  }

  .action-buttons {
    flex-direction: row !important;
  }
  
  .gradient-text {
    font-size: 5rem !important;
  }
  
  .v-icon {
    margin-right: 0 !important;
    margin-bottom: 16px;
  }
  
  .action-buttons .v-btn {
    font-size: 0.9rem; 
    min-width: auto; 
  }
}
</style>
