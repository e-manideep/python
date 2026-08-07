// Inlines the built JS/CSS into a single self-contained HTML fragment (no external
// requests except the Google Fonts links already in index.html, which degrade
// gracefully to the system-font fallback stack if blocked). Used to publish the app
// as a single-file artifact/preview without standing up separate static hosting.
// Run via `npm run bundle:single-file`.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIST = new URL("../dist", import.meta.url).pathname;
const OUT = process.argv[2] || "/tmp/trellis-artifact.html";

const assetsDir = join(DIST, "assets");
const files = readdirSync(assetsDir);
const jsFile = files.find((f) => f.endsWith(".js"));
const cssFile = files.find((f) => f.endsWith(".css"));

const js = readFileSync(join(assetsDir, jsFile), "utf8");
const css = readFileSync(join(assetsDir, cssFile), "utf8");

const html = `<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`;

writeFileSync(OUT, html);
console.log("wrote", OUT, `(${(html.length / 1024 / 1024).toFixed(2)} MB)`);
