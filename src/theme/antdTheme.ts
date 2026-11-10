import { theme } from 'antd';
import type { ThemeConfig } from 'antd';
import type { Theme } from '../types';
import { alpha, palette } from './palette';

const FONT_SANS = '"Inter Variable", Inter, system-ui, sans-serif';
// const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const FONT_MONO = FONT_SANS;

export function createFolioTheme(mode: Theme): ThemeConfig {
  const isDark = mode === 'dark';
  const semantic = isDark ? palette.semanticDark : palette.semanticLight;

  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: palette.primary,
      colorInfo: semantic.info,
      colorSuccess: semantic.success,
      colorWarning: semantic.warning,
      colorError: semantic.error,
      colorLink: palette.primary,
      colorLinkHover: palette.primaryHover,
      colorLinkActive: palette.primaryActive,
      colorBgBase: isDark ? palette.night : palette.paper,
      colorBgContainer: isDark ? palette.darkSurface : palette.paper,
      colorBgElevated: isDark ? palette.darkElevated : palette.paper,
      colorBgLayout: isDark ? palette.night : palette.shell,
      colorBorder: isDark ? alpha(palette.paper, 0.14) : alpha(palette.ink, 0.14),
      colorBorderSecondary: isDark ? alpha(palette.paper, 0.09) : alpha(palette.ink, 0.08),
      colorText: isDark ? palette.darkText : palette.ink,
      colorTextSecondary: isDark ? alpha(palette.darkText, 0.65) : alpha(palette.ink, 0.70),
      colorTextTertiary: isDark ? alpha(palette.darkText, 0.45) : alpha(palette.ink, 0.62),
      colorTextQuaternary: isDark ? alpha(palette.darkText, 0.25) : alpha(palette.ink, 0.50),
      colorTextPlaceholder: isDark ? alpha(palette.darkText, 0.45) : alpha(palette.ink, 0.62),
      colorTextDescription: isDark ? alpha(palette.darkText, 0.55) : alpha(palette.ink, 0.64),
      colorFillAlter: isDark ? alpha(palette.paper, 0.035) : alpha(palette.ink, 0.03),
      colorFillSecondary: isDark ? alpha(palette.paper, 0.06) : alpha(palette.ink, 0.05),
      fontFamily: FONT_SANS,
      fontFamilyCode: FONT_MONO,
      fontWeightStrong: 700,
      fontSize: 15,
      borderRadius: 10,
      borderRadiusLG: 14,
      borderRadiusSM: 7,
      controlHeight: 38,
      controlHeightSM: 30,
      lineWidth: 1,
      wireframe: false,
      boxShadow: `0 12px 32px -20px ${alpha(palette.ink, 0.24)}`,
      boxShadowSecondary: `0 24px 56px -28px ${alpha(palette.ink, 0.38)}`,
    },
    components: {
      Button: {
        fontWeight: 600,
        defaultShadow: 'none',
        primaryShadow: 'none',
        dangerShadow: 'none',
        paddingInline: 14,
      },
      Input: {
        activeShadow: `0 0 0 3px ${alpha(palette.primary, 0.12)}`,
        paddingBlock: 6,
      },
      InputNumber: {
        activeShadow: `0 0 0 3px ${alpha(palette.primary, 0.12)}`,
      },
      Select: {
        optionSelectedBg: isDark ? alpha(palette.primary, 0.2) : palette.lightTableHover,
      },
      DatePicker: {
        activeShadow: `0 0 0 3px ${alpha(palette.primary, 0.12)}`,
      },
      Table: {
        headerBg: isDark ? palette.darkTableHeader : palette.lightTableHeader,
        headerColor: isDark ? alpha(palette.darkText, 0.58) : alpha(palette.ink, 0.68),
        headerSplitColor: 'transparent',
        rowHoverBg: isDark ? alpha(palette.primary, 0.08) : alpha(palette.primary, 0.04),
        borderColor: isDark ? alpha(palette.paper, 0.08) : alpha(palette.ink, 0.07),
        cellPaddingBlock: 12,
        cellPaddingInline: 14,
        footerBg: isDark ? palette.darkTableHeader : palette.lightTableHeader,
      },
      Message: {
        contentBg: isDark ? palette.darkElevated : palette.paper,
        colorText: isDark ? palette.darkText : palette.ink,
      },
      Modal: {
        contentBg: isDark ? palette.darkSurface : palette.paper,
        headerBg: isDark ? palette.darkSurface : palette.paper,
        titleFontSize: 16,
      },
      Dropdown: {
        paddingBlock: 6,
      },
      Tooltip: {
        colorBgSpotlight: isDark ? palette.darkElevated : palette.ink,
        colorTextLightSolid: isDark ? palette.darkText : palette.paper,
      },
      Form: {
        itemMarginBottom: 16,
        verticalLabelPadding: '0 0 6px',
      },
      Alert: {
        withDescriptionPadding: '12px 14px',
      },
      Progress: {
        defaultColor: palette.primary,
      },
      Segmented: {
        trackBg: isDark ? alpha(palette.paper, 0.06) : alpha(palette.ink, 0.05),
        itemSelectedBg: isDark ? palette.darkElevated : palette.paper,
        itemHoverBg: 'transparent',
        itemActiveBg: 'transparent',
        itemSelectedColor: isDark ? palette.darkText : palette.ink,
        itemColor: isDark ? alpha(palette.darkText, 0.65) : alpha(palette.ink, 0.72),
        trackPadding: 3,
      },
    },
  };
}
