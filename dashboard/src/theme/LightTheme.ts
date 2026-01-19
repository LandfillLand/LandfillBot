import type { ThemeTypes } from '@/types/themeTypes/ThemeType';

const PurpleTheme: ThemeTypes = {
  name: 'PurpleTheme',
  dark: false,
  variables: {
    'border-color': '#38bdf8',
    'carousel-control-size': 10
  },
  colors: {
    primary: '#38bdf8',
    secondary: '#0ea5e9',
    info: '#38bdf8',
    success: '#00c853',
    accent: '#FFAB91',
    warning: '#ffc107',
    error: '#f44336',
    lightprimary: '#e0f2ff',
    lightsecondary: '#bae6fd',
    lightsuccess: '#b9f6ca',
    lighterror: '#f9d8d8',
    lightwarning: '#fff8e1',
    primaryText: '#1b1c1d',
    secondaryText: '#000000aa',
    darkprimary: '#0c4a6e',
    darksecondary: '#075985',
    borderLight: '#d0d0d0',
    border: '#d0d0d0',
    inputBorder: '#787878',
    containerBg: '#f9fafcf4',
    surface: '#fff',
    'on-surface-variant': '#fff',
    facebook: '#4267b2',
    twitter: '#1da1f2',
    linkedin: '#0e76a8',
    gray100: '#fafafacc',
    primary200: '#7dd3fc',
    secondary200: '#38bdf8',
    background: '#ffffff',
    overlay: '#ffffffaa',
    codeBg: '#ececec',
    preBg: 'rgb(249, 249, 249)',
    code: 'rgb(13, 13, 13)',
    chatMessageBubble: '#dbeafe',
    mcpCardBg: '#e0f2ff',
  }
};

export { PurpleTheme };
