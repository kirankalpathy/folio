import { theme } from 'antd';
import type { ThemeConfig } from 'antd';
import type { Theme } from '../types';

const FONT_SANS = '"Inter Variable", Inter, system-ui, sans-serif';
// const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const FONT_MONO = FONT_SANS;

export function createFolioTheme(mode: Theme): ThemeConfig {
  const isDark = mode === 'dark';

  const semantic = isDark
    ? {
        info: '#3C9AE8',
        success: '#30B651',
        warning: '#F5A623',
        error: '#E5484D',
      }
    : {
        info: '#1890FF',
        success: '#128937',
        warning: '#FA8C16',
        error: '#DB372D',
      };

  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#C8502D',
      colorInfo: semantic.info,
      colorSuccess: semantic.success,
      colorWarning: semantic.warning,
      colorError: semantic.error,
      colorLink: '#C8502D',
      colorLinkHover: '#B44526',
      colorLinkActive: '#9E3A1F',
      colorBgBase: isDark ? '#141414' : '#FFFFFF',
      colorBgContainer: isDark ? '#1E1E1E' : '#FFFFFF',
      colorBgElevated: isDark ? '#262626' : '#FFFFFF',
      colorBgLayout: isDark ? '#141414' : '#FBF8F6',
      colorBorder: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(42, 26, 20, 0.14)',
      colorBorderSecondary: isDark
        ? 'rgba(255, 255, 255, 0.09)'
        : 'rgba(42, 26, 20, 0.08)',
      colorText: isDark ? '#F3F4F6' : '#2A1A14',
      colorTextSecondary: isDark ? 'rgba(243, 244, 246, 0.65)' : 'rgba(42, 26, 20, 0.62)',
      colorTextTertiary: isDark ? 'rgba(243, 244, 246, 0.45)' : 'rgba(42, 26, 20, 0.45)',
      colorTextQuaternary: isDark ? 'rgba(243, 244, 246, 0.25)' : 'rgba(42, 26, 20, 0.25)',
      colorFillAlter: isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(42, 26, 20, 0.03)',
      colorFillSecondary: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(42, 26, 20, 0.05)',
      fontFamily: FONT_SANS,
      fontFamilyCode: FONT_MONO,
      fontSize: 14,
      borderRadius: 10,
      borderRadiusLG: 14,
      borderRadiusSM: 7,
      controlHeight: 38,
      controlHeightSM: 30,
      lineWidth: 1,
      wireframe: false,
      boxShadow: '0 12px 32px -20px rgba(42, 26, 20, 0.24)',
      boxShadowSecondary: '0 24px 56px -28px rgba(42, 26, 20, 0.38)',
    },
    components: {
      Button: {
        fontWeight: 500,
        defaultShadow: 'none',
        primaryShadow: 'none',
        dangerShadow: 'none',
        paddingInline: 14,
      },
      Input: {
        activeShadow: '0 0 0 3px rgba(200, 80, 45, 0.12)',
        paddingBlock: 6,
      },
      InputNumber: {
        activeShadow: '0 0 0 3px rgba(200, 80, 45, 0.12)',
      },
      Select: {
        optionSelectedBg: isDark ? 'rgba(200, 80, 45, 0.2)' : '#FBEFEA',
      },
      DatePicker: {
        activeShadow: '0 0 0 3px rgba(200, 80, 45, 0.12)',
      },
      Table: {
        headerBg: isDark ? '#1A1A1A' : '#FAF6F3',
        headerColor: isDark ? 'rgba(243, 244, 246, 0.58)' : 'rgba(42, 26, 20, 0.55)',
        headerSplitColor: 'transparent',
        rowHoverBg: isDark ? 'rgba(200, 80, 45, 0.08)' : 'rgba(200, 80, 45, 0.04)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(42, 26, 20, 0.07)',
        cellPaddingBlock: 12,
        cellPaddingInline: 14,
        footerBg: isDark ? '#1A1A1A' : '#FAF6F3',
      },
      Message: {
        contentBg: isDark ? '#262626' : '#FFFFFF',
        colorText: isDark ? '#F3F4F6' : '#2A1A14',
      },
      Modal: {
        contentBg: isDark ? '#1E1E1E' : '#FFFFFF',
        headerBg: isDark ? '#1E1E1E' : '#FFFFFF',
        titleFontSize: 16,
      },
      Dropdown: {
        paddingBlock: 6,
      },
      Tooltip: {
        colorBgSpotlight: isDark ? '#262626' : '#2A1A14',
      },
      Form: {
        itemMarginBottom: 16,
        verticalLabelPadding: '0 0 6px',
      },
      Alert: {
        withDescriptionPadding: '12px 14px',
      },
      Progress: {
        defaultColor: '#C8502D',
      },
    },
  };
}
