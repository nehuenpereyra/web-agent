export function splitTextSmart(text: string, maxLength = 2500): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxLength, text.length);
    
    let lastDelimiter = Math.max(
      text.lastIndexOf('.', end),
      text.lastIndexOf('?', end),
      text.lastIndexOf('!', end),
      text.lastIndexOf('\n', end),
      text.lastIndexOf(' ', end)
    );

    if (lastDelimiter <= start + 1000) { 
      lastDelimiter = end; 
    }

    const chunk = text.slice(start, lastDelimiter).trim();
    chunks.push(chunk);
    start = lastDelimiter;
  }

  return chunks.filter(c => c.length > 0);
}