// Writes public/badges/qr-ios.svg and qr-android.svg from src/data/store-links.json,
// and dist/badges/ copies when a build exists. A store whose link is still null
// gets no QR file (and any stale one is removed), so the page shows the badge
// alone. Runs in postbuild next to copy-routes; safe to run by hand too.
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import QRCode from 'qrcode';

const links = JSON.parse(readFileSync('src/data/store-links.json', 'utf8'));
const targets = ['public/badges', ...(existsSync('dist') ? ['dist/badges'] : [])];

for (const store of ['ios', 'android']) {
  const url = links[store];
  for (const dir of targets) {
    const file = join(dir, `qr-${store}.svg`);
    if (!url) {
      if (existsSync(file)) rmSync(file);
      continue;
    }
    mkdirSync(dir, { recursive: true });
    const svg = await QRCode.toString(url, {
      type: 'svg',
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0A0A0AFF', light: '#FAFAFAFF' },
    });
    writeFileSync(file, svg);
  }
  console.log(`qr: ${store} ${url ? 'written' : 'skipped (no link yet)'}`);
}
