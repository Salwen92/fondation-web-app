export function formatTime(date: Date): string {
  return date.toLocaleTimeString();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

export function formatToolResult(result: string, maxLength: number = 100): string {
  return truncateText(result, maxLength);
}
