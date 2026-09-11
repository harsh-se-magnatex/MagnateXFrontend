export type CsvCell = string | number | boolean | null | undefined;

function escapeCsvCell(value: CsvCell): string {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: CsvCell[][]
): void {
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
