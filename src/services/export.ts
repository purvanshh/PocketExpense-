import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { Expense } from '../store/slices/expenseSlice';
import { summarise, toCSV, toHTML, type ExportRange } from './exportFormat';

// The formatting logic lives in ./exportFormat so it stays testable without
// the native file, print and sharing modules pulled in here.
export {
    selectForExport,
    summarise,
    toCSV,
    toHTML,
    type ExportRange,
    type ExportSummary,
} from './exportFormat';

const safeName = (label: string) =>
    label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function share(uri: string, mimeType: string, title: string): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device');
    }
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: title, UTI: mimeType });
}

/** Write the rows to a CSV in the cache directory and open the share sheet. */
export async function exportCSV(rows: Expense[], range: ExportRange): Promise<string> {
    const file = new File(Paths.cache, `pocketexpense-${safeName(range.label)}.csv`);

    // Overwrite any file left behind by a previous export of the same period.
    if (file.exists) file.delete();
    file.create();
    file.write(toCSV(rows));

    await share(file.uri, 'text/csv', `Export ${range.label}`);
    return file.uri;
}

/** Render the rows to a PDF and open the share sheet. */
export async function exportPDF(
    rows: Expense[],
    range: ExportRange,
    currency = 'INR'
): Promise<string> {
    const summary = summarise(rows);
    const html = toHTML(rows, summary, range, currency);

    const { uri } = await Print.printToFileAsync({ html, base64: false });

    await share(uri, 'application/pdf', `Export ${range.label}`);
    return uri;
}
