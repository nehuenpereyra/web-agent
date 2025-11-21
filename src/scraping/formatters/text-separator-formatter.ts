export function cleanText(text: string): string {
  return text
    .replace(/\0/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/[\u0000-\u001F\u007F]/g, '')
}

export function splitBySeparator(text: string, separator: string = '================================================================================'): string[] {
    const entries = text.split(separator);
    return entries.map(e => cleanText(e)).filter(e => e.length > 0);
}
