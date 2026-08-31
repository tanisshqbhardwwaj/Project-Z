import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function resolvePublicUrl(env) {
  const fromEnv =
    env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    env.AUTH_URL?.trim().replace(/\/$/, "") ||
    env.CAPACITOR_SERVER_URL?.trim().replace(/\/$/, "");
  return fromEnv || "https://www.econsole.in";
}

function patchFile(path, replacer) {
  const full = join(root, path);
  if (!existsSync(full)) {
    console.warn(`skip ${path} (missing)`);
    return;
  }
  const next = replacer(readFileSync(full, "utf8"));
  if (next !== null) {
    writeFileSync(full, next, "utf8");
    console.log(`patched ${path}`);
  }
}

const env = { ...loadEnvFile(), ...process.env };
const publicUrl = resolvePublicUrl(env);
let host;
try {
  host = new URL(publicUrl).hostname;
} catch {
  console.error(`Invalid public URL: ${publicUrl}`);
  process.exit(1);
}

console.log(`Native app URL → ${publicUrl} (host: ${host})`);

function patchProductionUrl(path) {
  patchFile(path, (content) =>
    content.replace(
      /var PRODUCTION_URL = "[^"]*";/,
      `var PRODUCTION_URL = "${publicUrl}";`
    )
  );
}

for (const shellPath of [
  "desktop/shell/index.html",
  "desktop/dist/index.html",
  "android-www/index.html",
]) {
  patchProductionUrl(shellPath);
}

patchFile("desktop/src-tauri/tauri.conf.json", (content) => {
  try {
    const json = JSON.parse(content);
    if (json.plugins?.updater?.endpoints?.[0]) {
      json.plugins.updater.endpoints[0] = `${publicUrl}/api/desktop-updates/{{target}}/{{arch}}/{{current_version}}`;
    }
    return `${JSON.stringify(json, null, 2)}\n`;
  } catch {
    return null;
  }
});

patchFile("android/app/src/main/AndroidManifest.xml", (content) => {
  let next = content.replace(
    /<data android:scheme="https" android:host="[^"]+" \/>/,
    `<data android:scheme="https" android:host="${host}" />`
  );
  if (!next.includes("com.google.mlkit.vision.DEPENDENCIES")) {
    next = next.replace(
      "<application",
      `<application`
    );
    next = next.replace(
      /(<application[^>]*>)/,
      `$1\n\n        <meta-data android:name="com.google.mlkit.vision.DEPENDENCIES" android:value="barcode" />`
    );
  }
  return next;
});

patchFile("android/README.md", (content) =>
  content.replace(
    /default `https:\/\/[^`]+`/,
    `default from NEXT_PUBLIC_APP_URL (\`${publicUrl}\`)`
  )
);

console.log("Native URL sync complete.");
