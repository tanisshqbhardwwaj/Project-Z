/** Browser stub so Next.js never loads sql.js WASM in the web app. */
export default async function initSqlJs(): Promise<never> {
  throw new Error("sql.js is not available in the web app");
}
