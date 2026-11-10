import dayjs from 'dayjs';
import { jsPDF } from 'jspdf';
import { getDateFormatId } from '../utils/date';

export function exportDateTimeLabel(): string {
  const now = dayjs();
  return `${now.format(getDateFormatId())} - ${now.format('hh:mm:ss A')}`;
}

export function stampName(prefix: string, ext: string): string {
  const stamp = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${stamp.getFullYear()}-${pad(stamp.getMonth() + 1)}-${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}${pad(stamp.getSeconds())}.${ext}`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

let interFontsPromise: Promise<{ regular: string; bold: string } | null> | null = null;

async function loadInterFonts(): Promise<{ regular: string; bold: string } | null> {
  if (!interFontsPromise) {
    interFontsPromise = (async () => {
      try {
        const [regRes, boldRes] = await Promise.all([
          fetch('/fonts/inter/Inter-Regular.ttf'),
          fetch('/fonts/inter/Inter-Bold.ttf'),
        ]);
        if (!regRes.ok || !boldRes.ok) return null;
        const [regBuf, boldBuf] = await Promise.all([regRes.arrayBuffer(), boldRes.arrayBuffer()]);
        return { regular: arrayBufferToBase64(regBuf), bold: arrayBufferToBase64(boldBuf) };
      } catch {
        return null;
      }
    })();
  }
  return interFontsPromise;
}

export async function registerInterFont(doc: jsPDF): Promise<string> {
  const fonts = await loadInterFonts();
  if (!fonts) return 'helvetica';
  doc.addFileToVFS('Inter-Regular.ttf', fonts.regular);
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
  doc.addFileToVFS('Inter-Bold.ttf', fonts.bold);
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');
  return 'Inter';
}

export async function loadLogoDataUrl(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const svgText = await res.text();
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('logo load failed'));
        image.src = objectUrl;
      });
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return { dataUrl: canvas.toDataURL('image/png'), width: img.naturalWidth || canvas.width / scale, height: img.naturalHeight || canvas.height / scale };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

export type PdfSemanticColor = 'info' | 'success' | 'warning' | 'error' | 'neutral';

export const SEMANTIC_RGB: Record<PdfSemanticColor, { bg: [number, number, number]; border: [number, number, number]; text: [number, number, number] }> = {
  info: { bg: [239, 246, 255], border: [147, 197, 253], text: [29, 78, 216] },
  success: { bg: [240, 253, 244], border: [134, 239, 172], text: [21, 128, 61] },
  warning: { bg: [254, 252, 232], border: [253, 224, 71], text: [161, 98, 7] },
  error: { bg: [254, 242, 242], border: [252, 165, 165], text: [185, 28, 28] },
  neutral: { bg: [248, 245, 242], border: [220, 210, 202], text: [72, 58, 52] },
};

export interface PdfFilterTag {
  label: string;
  color?: PdfSemanticColor;
}

export interface PdfFilter {
  type: 'text' | 'tags';
  label: string;
  value?: string;
  tags?: PdfFilterTag[];
}

export function drawRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fill: [number, number, number], stroke?: [number, number, number]) {
  doc.setFillColor(...fill);
  if (stroke) doc.setDrawColor(...stroke);
  else doc.setDrawColor(...fill);
  doc.setLineWidth(stroke ? 0.6 : 0);
  doc.roundedRect(x, y, w, h, r, r, stroke ? 'FD' : 'F');
}

export function drawTagPill(doc: jsPDF, font: string, text: string, x: number, yTop: number, color: PdfSemanticColor): number {
  const c = SEMANTIC_RGB[color];
  doc.setFont(font, 'normal');
  doc.setFontSize(7);
  const padX = 5;
  const h = 14;
  const textW = doc.getTextWidth(text);
  const w = textW + padX * 2;
  drawRoundedRect(doc, x, yTop, w, h, 4, c.bg, c.border);
  doc.setTextColor(...c.text);
  doc.text(text, x + padX, yTop + 9.5);
  return w;
}

export function drawSimpleFilters(
  doc: jsPDF,
  font: string,
  filters: PdfFilter[],
  marginX: number,
  tableW: number,
  startY: number,
): number {
  const active = filters.filter((f) => (f.type === 'text' ? !!f.value?.trim() : (f.tags?.length ?? 0) > 0));
  if (active.length === 0) return startY;
  let y = startY;
  doc.setFont(font, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(42, 26, 20);
  doc.text('Filters:', marginX, y);
  y += 4;
  const rowH = 18;
  let fx = marginX;
  let fy = y;
  const maxX = marginX + tableW;
  const gap = 6;
  const groupGap = 12;
  const newFilterRow = () => { fx = marginX; fy += rowH; };
  for (const f of active) {
    doc.setFont(font, 'bold');
    doc.setFontSize(7.5);
    const labelText = `${f.label}:`;
    const labelW = doc.getTextWidth(labelText) + 4;
    if (fx !== marginX && fx + labelW > maxX) newFilterRow();
    doc.setTextColor(90, 80, 75);
    doc.text(labelText, fx, fy + 10);
    fx += labelW;
    if (f.type === 'text' && f.value) {
      const w = drawTagPill(doc, font, f.value, fx, fy, 'neutral');
      fx += w + groupGap;
    } else if (f.type === 'tags' && f.tags) {
      for (const tag of f.tags) {
        doc.setFont(font, 'normal');
        doc.setFontSize(7);
        const estW = doc.getTextWidth(tag.label) + 14;
        if (fx !== marginX && fx + estW > maxX) newFilterRow();
        const w = drawTagPill(doc, font, tag.label, fx, fy, tag.color ?? 'neutral');
        fx += w + gap;
      }
      fx += groupGap - gap;
    }
  }
  return fy + rowH + 6;
}
