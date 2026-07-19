// Packages a user's full account data (see SupabaseService.exportAccountData)
// into a downloadable PDF — the "export your data" user right described in
// the Privacy Policy (Section 8) and Terms of Service. Uses expo-print +
// expo-sharing (both already installed and already proven in
// ReportService.js's Sun Profile export) rather than handing the raw JSON
// string to React Native's Share API: a full account export (every session,
// every reading) can be large, and passing that much text as a share-sheet
// `message` made both the share sheet and the receiving app hang/blank out
// trying to render it inline. A real file has no such limit.
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import SupabaseService from './SupabaseService';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildExportHtml(data) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
  <style>
    @page { margin: 40px 36px; }
    body { font-family: Helvetica, Arial, sans-serif; color: #1A1712; font-size: 11px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    p.meta { color: #555; font-size: 10.5px; margin: 0 0 18px; }
    pre { background: #F7F4EF; border: 1px solid #eee; border-radius: 8px; padding: 14px;
          font-family: 'Courier New', monospace; font-size: 9.5px; line-height: 1.5;
          white-space: pre-wrap; word-break: break-word; }
  </style></head><body>
    <h1>Your Sureva Data</h1>
    <p class="meta">Full account export &mdash; profile, sessions, readings, events, and skin age history. Generated ${esc(new Date().toLocaleString())}.</p>
    <pre>${esc(JSON.stringify(data, null, 2))}</pre>
  </body></html>`;
}

export async function exportAndShareAccountData(uid) {
  try {
    const { data, error } = await SupabaseService.exportAccountData(uid);
    if (error || !data) {
      return { ok: false, message: 'Could not gather your data. Please try again.' };
    }

    const html = buildExportHtml(data);
    const { uri } = await Print.printToFileAsync({ html });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      return { ok: false, message: 'Sharing is not available on this device.' };
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Share Your Sureva Data',
    });
    return { ok: true };
  } catch (e) {
    console.log('Data export failed:', e);
    return { ok: false, message: 'Could not export your data. Please try again.' };
  }
}
