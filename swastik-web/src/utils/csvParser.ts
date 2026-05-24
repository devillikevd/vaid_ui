/**
 * A lightweight CSV parser that handles commas inside quotes.
 */
export function parseCSV(csvText: string): any[] {
    if (!csvText || !csvText.trim()) return [];

    // Basic logic to handle quotes and commas
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return []; // No data rows

    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row: any = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = values[j] !== undefined ? values[j].trim() : '';
        }
        data.push(row);
    }

    return data;
}

function parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);

    // Remove surrounding quotes if present
    return result.map(val => val.replace(/^"|"$/g, ''));
}
