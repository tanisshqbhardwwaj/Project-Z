import fs from "node:fs";
import { execSync } from "node:child_process";

const CONFLICT_RE =
  /^<<<<<<< HEAD\r?\n([\s\S]*?)^=======\r?\n([\s\S]*?)^>>>>>>> origin\/master\r?\n/gm;

function listConflictFiles() {
  try {
    return execSync('git grep -l "^<<<<<<< "', { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function pickSide(file, head, master) {
  const headTrim = head.trim();
  const masterTrim = master.trim();
  if (!headTrim) return master;
  if (!masterTrim) return head;

  const preferHead =
    /middleware\.ts$/.test(file) ||
    /shop\/dashboard\/route\.ts$/.test(file) ||
    /shopkeeper-dashboard\.tsx$/.test(file) ||
    /lib\/api\/context\.ts$/.test(file) ||
    /auth\/logout\/route\.ts$/.test(file) ||
    /use-require-auth\.ts$/.test(file) ||
    /lib\/auth\/logout-client\.ts$/.test(file);

  if (preferHead) return head;

  const preferMaster =
    /shop|invoice|cashier|staff|prisma|billing|ops\/|held-bill|udhaar|purchase|return|inventory|expense|payroll|offer|sales|customer|architect|builder|contractor|desktop\/plan|organization\.service|shop\.service|shop-return|shop-credit|shop-held|shop-purchase|shop-expense|shop-activity|bill-number|invoice-pricing|invoice-entry|cashier-mode|shop-settings|require-module|local-mode|product-stock|shop-invoice-print|staff-sales|invoice-return|staff-profile|plan-cards|command-palette|app-shell|app-layout|providers\.tsx|onboarding|use-nav-items|storage-quota|staff\.service|register\/route|login\/route|organizations\/route|layout\.tsx$/.test(
      file.replaceAll("\\", "/")
    ) ||
    file === "package-lock.json";

  if (preferMaster) return master;

  // Default: keep App (HEAD) for platform/infra files
  return head;
}

function resolveFile(file) {
  let content = fs.readFileSync(file, "utf8");
  if (!content.includes("<<<<<<< HEAD")) return false;

  if (file === "next.config.ts") {
    content = content.replace(CONFLICT_RE, (_, head, master) => {
      const packages = [
        '"pdf-parse"',
        '"pdfjs-dist"',
        '"tesseract.js"',
        '"inngest"',
        '"heic-convert"',
        '"sql.js"',
      ];
      const redirects = master.includes("redirects()")
        ? master
            .replace(/^\s*serverExternalPackages:[^\n]*\n/gm, "")
            .trim()
        : "";
      return `  serverExternalPackages: [${packages.join(", ")}],
  turbopack: {
    resolveAlias: {
      "sql.js": "./src/lib/local-db/sqljs-browser-stub.ts",
    },
  },
  ${redirects}
`;
    });
    fs.writeFileSync(file, content);
    return true;
  }

  if (file === "package.json") {
    content = content.replace(CONFLICT_RE, () => {
      return `    "@tanstack/react-query": "^5.102.2",
    "@tanstack/react-query-devtools": "^5.101.4",
`;
    });
    fs.writeFileSync(file, content);
    return true;
  }

  if (file === ".env.example") {
    content = content.replace(CONFLICT_RE, (_, head) => head);
    fs.writeFileSync(file, content);
    return true;
  }

  content = content.replace(CONFLICT_RE, (_, head, master) =>
    pickSide(file, head, master)
  );
  fs.writeFileSync(file, content);
  return true;
}

const files = listConflictFiles();
let resolved = 0;
for (const file of files) {
  if (resolveFile(file)) resolved++;
  const remaining = fs.readFileSync(file, "utf8");
  if (remaining.includes("<<<<<<< HEAD")) {
    console.error(`Still has conflicts: ${file}`);
    process.exitCode = 1;
  }
}

console.log(`Resolved ${resolved}/${files.length} files.`);
