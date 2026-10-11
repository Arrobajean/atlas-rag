// Mide el JavaScript del cliente tras `next build` (bruto y comprimido con gzip).
//   node scripts/medir-bundle.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const dir = join(".next", "static", "chunks");
let bruto = 0;
let gz = 0;
const grandes = [];
const recorrer = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) recorrer(p);
    else if (f.endsWith(".js")) {
      const b = readFileSync(p);
      const z = gzipSync(b).length;
      bruto += b.length;
      gz += z;
      grandes.push([f, b.length, z]);
    }
  }
};
recorrer(dir);
grandes.sort((a, b) => b[2] - a[2]);
console.log(`Total JS cliente: ${(bruto / 1024).toFixed(0)} KB (gzip ${(gz / 1024).toFixed(0)} KB) en ${grandes.length} archivos`);
console.log("Mayores (gzip):");
for (const [f, , z] of grandes.slice(0, 8)) console.log(`  ${(z / 1024).toFixed(0).padStart(4)} KB  ${f}`);
