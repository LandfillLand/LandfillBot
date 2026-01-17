<template>
    <div class="welcome-container fade-in">
        <div v-if="isLoading" class="loading-overlay-welcome">
            <v-progress-circular
                indeterminate
                size="48"
                width="4"
                color="primary"
            ></v-progress-circular>
        </div>
        <template v-else>
            <div class="welcome-content">
                <div class="welcome-title">
                    <span class="bot-name-container">
                        <span class="bot-name-text">
                            Hello, I'm <span class="highlight-name">{{ botName }}</span>
                        </span>
                        <v-icon size="small" class="bot-name-star">mdi-star-four-points</v-icon>
                    </span>
                </div>
            </div>
            <div v-if="hasDefaultSlot" class="welcome-input">
                <slot></slot>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';

interface Props {
    isLoading?: boolean;
    botName?: string;
}

withDefaults(defineProps<Props>(), {
    isLoading: false,
    botName: 'Nebula',
});

const slots = useSlots();
const hasDefaultSlot = computed(() => Boolean(slots.default));
</script>

<style scoped>
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.welcome-container {
    height: 100%;
    width: 100%;
    justify-content: center;
    display: flex;
    align-items: center;
    flex-direction: column;
    position: relative;
}

.welcome-content {
    padding: 24px 0px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.welcome-title {
    font-size: 28px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
}

.welcome-input {
    width: 75%;
}

.loading-overlay-welcome {
    display: flex;
    justify-content: center;
    align-items: center;
}

.bot-name-container {
    display: flex;
    align-items: center;
}

.highlight-name {
    color: var(--v-theme-secondary);
    font-weight: 700;
}

.bot-name-text {
    overflow: hidden;
    white-space: nowrap;
    width: 0;
    opacity: 0;
    animation: revealText 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    animation-delay: 0.2s;
}

.bot-name-star {
    margin-left: 0;
    display: inline-flex;
    transform-origin: center;
    animation: rotateStar 1.2s cubic-bezier(0.34, 1, 0.64, 1) forwards;
    animation-delay: 0.2s;
    padding-left: 4px;
    background: linear-gradient(135deg, #ffe082, #fdd835, #ff8f00, #ffe082);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
    animation: rotateStar 1.2s cubic-bezier(0.34, 1, 0.64, 1) forwards,
               gradientShift 4s ease-in-out infinite;
}

.fade-in {
    animation: fadeIn 0.3s ease-in-out;
}

@media (max-width: 600px) {
    .welcome-input {
        width: 100%;
    }
}

@keyframes revealText {
    from {
        width: 0;
        opacity: 0;
    }
    to {
        width: 9.2em;
        opacity: 1;
    }
}

@keyframes rotateStar {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

@keyframes gradientShift {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
}
</style>
