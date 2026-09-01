import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const html = join(process.cwd(), "docs", "architecture", "project-z-architecture.html");
const out = join(process.cwd(), "docs", "architecture", "project-z-architecture.pdf");
mkdirSync(dirname(out), { recursive: true });

let browser;
try {
  browser = await chromium.launch({ channel: "msedge" });
} catch {
  browser = await chromium.launch({ channel: "chrome" });
}
const page = await browser.newPage();
await page.goto(pathToFileURL(html).href, { waitUntil: "networkidle" });
await page.pdf({
  path: out,
  format: "A4",
  landscape: true,
  printBackground: true,
  margin: { top: "12mm", bottom: "14mm", left: "12mm", right: "12mm" },
  displayHeaderFooter: true,
  headerTemplate: `<div></div>`,
  footerTemplate: `
    <div style="font-size:8px;color:#666;width:100%;padding:0 16mm;display:flex;justify-content:space-between;">
      <span>Project Z · System architecture</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`,
});
await browser.close();
console.log(`Wrote ${out}`);
