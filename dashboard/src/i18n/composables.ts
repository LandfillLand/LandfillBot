import { ref, computed } from 'vue';
import { translations as staticTranslations } from './translations';
import type { Locale } from './types';

const currentLocale = ref<Locale>('zh-CN');
const translations = ref<Record<string, any>>({});

/**
 * 初始化i18n系统
 */
export async function initI18n(locale: Locale = 'zh-CN') {
  currentLocale.value = locale;
  loadTranslations(locale);
}

/**
 * 加载翻译数据（现在从静态导入获取）
 */
function loadTranslations(locale: Locale) {
  try {
    const data = staticTranslations[locale];
    if (data) {
      translations.value = data;
    } else {
      console.warn(`Translations not found for locale: ${locale}`);
      if (locale !== 'zh-CN') {
        console.log('Falling back to zh-CN');
        translations.value = staticTranslations['zh-CN'];
      }
    }
  } catch (error) {
    console.error(`Failed to load translations for ${locale}:`, error);
    if (locale !== 'zh-CN') {
      console.log('Falling back to zh-CN');
      translations.value = staticTranslations['zh-CN'];
    }
  }
}

/**
 * 主要的翻译函数组合
 */
export function useI18n() {
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations.value;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return `[MISSING: ${key}]`;
      }
    }
    
    if (typeof value !== 'string') {
      console.warn(`Translation value is not string: ${key}`, value);
      return `[INVALID: ${key}]`;
    }
    
    let result: string = value;
    
    if (params) {
      result = result.replace(/\{(\w+)\}/g, (match: string, paramKey: string) => {
        return params[paramKey]?.toString() || match;
      });
    }
    
    return result;
  };
  
  const setLocale = async (newLocale: Locale) => {
    if (newLocale !== currentLocale.value) {
      currentLocale.value = newLocale;
      loadTranslations(newLocale);
      localStorage.setItem('astrbot-locale', newLocale);
    }
  };
  
  const locale = computed(() => currentLocale.value);
  const availableLocales: Locale[] = ['zh-CN', 'en-US'];
  const isLoaded = computed(() => Object.keys(translations.value).length > 0);
  
  return {
    t,
    locale,
    setLocale,
    availableLocales,
    isLoaded
  };
}

/**
 * 模块特定的翻译函数
 */
export function useModuleI18n(moduleName: string) {
  const { t } = useI18n();
  
  const tm = (key: string, params?: Record<string, string | number>): string => {
    const normalizedModuleName = moduleName.replace(/\//g, '.');
    return t(`${normalizedModuleName}.${key}`, params);
  };
  
  const getRaw = (key: string): any => {
    const normalizedModuleName = moduleName.replace(/\//g, '.');
    const fullKey = `${normalizedModuleName}.${key}`;
    const keys = fullKey.split('.');
    let value: any = translations.value;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }
    
    return value;
  };
  
  return { tm, getRaw };
}

/**
 * 语言切换器组合函数
 */
export function useLanguageSwitcher() {
  const { locale, setLocale, availableLocales } = useI18n();
  
  const languageOptions = computed(() => [
    { 
      value: 'zh-CN', 
      label: '简体中文', 
      flag: 'cn' 
    }, 
    { 
      value: 'en-US', 
      label: 'English', 
      flag: 'us' 
    }
  ]);
  
  const currentLanguage = computed(() => {
    return languageOptions.value.find(lang => lang.value === locale.value);
  });
  
  const switchLanguage = async (newLocale: Locale) => {
    await setLocale(newLocale);
  };
  
  return {
    locale,
    languageOptions,
    currentLanguage,
    switchLanguage,
    availableLocales
  };
}

export async function setupI18n() {
  const savedLocale = localStorage.getItem('astrbot-locale') as Locale;
  const initialLocale = savedLocale && ['zh-CN', 'en-US'].includes(savedLocale) 
    ? savedLocale 
    : 'zh-CN';
  
  await initI18n(initialLocale);
}