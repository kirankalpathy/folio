export const UPI_ID_REGEX = /^[a-zA-Z0-9.-]{2,256}@[a-zA-Z][a-zA-Z]{2,64}$/;

export function isValidUpiId(value: string | undefined | null): boolean {
  const v = value?.trim();
  return Boolean(v && UPI_ID_REGEX.test(v));
}

function encodeQueryParam(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '%20'); // explicit %20 for spaces/special chars (API/UPI friendly)
}

export function buildUpiPayUri(params: {
  pa: string;
  pn?: string;
  am?: number | string;
  tn?: string;
  cu?: string;
}): string {
  const parts: string[] = [];
  parts.push(`pa=${encodeQueryParam(params.pa.trim())}`);
  if (params.pn?.trim()) parts.push(`pn=${encodeQueryParam(params.pn.trim())}`);
  if (params.am !== undefined && params.am !== null && `${params.am}`.trim() !== '') {
    parts.push(`am=${encodeQueryParam(`${params.am}`.trim())}`);
  }
  parts.push(`cu=${encodeQueryParam(params.cu?.trim() || 'INR')}`);
  if (params.tn?.trim()) parts.push(`tn=${encodeQueryParam(params.tn.trim())}`);
  return `upi://pay?${parts.join('&')}`;
}
