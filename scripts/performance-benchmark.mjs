import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { performance } from "node:perf_hooks";

const mode = process.argv[2];
const percentile = (values, p) => [...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
if (mode === "bundle") {
  const dir = resolve("dist/assets");
  const files = (await readdir(dir)).filter(name => /\.(js|css)$/.test(name));
  if (!files.length) throw new Error("No compiled assets found");
  const rows = await Promise.all(files.map(async name => {
    const bytes = await readFile(join(dir,name));
    return { name, bytes: bytes.length, gzipBytes: gzipSync(bytes).length };
  }));
  const html = await readFile("dist/index.html","utf8");
  const initial = new Set([...html.matchAll(/(?:src|href)=["'](?:\.\/|\/)?assets\/([^"']+\.(?:js|css))["']/g)].map(x=>x[1]));
  if (!initial.size) throw new Error("No homepage entry assets found");
  const entry = rows.filter(row=>initial.has(row.name));
  if (entry.length !== initial.size) throw new Error("Missing homepage asset");
  const initialGzipBytes = entry.reduce((sum,row)=>sum+row.gzipBytes,0);
  const serverBytes = (await stat("dist/server.cjs")).size;
  const report = { initialGzipBytes, serverBytes, largestAssets: rows.sort((a,b)=>b.gzipBytes-a.gzipBytes).slice(0,10) };
  console.log(JSON.stringify(report,null,2));
  // Provisional ceiling; tighten after collecting stable build baselines.
  const budget = Number(process.env.INITIAL_GZIP_BUDGET_BYTES || 1048576);
  if (!Number.isFinite(budget) || budget <= 0) throw new Error("Invalid bundle budget");
  if (initialGzipBytes > budget) throw new Error("Homepage entry assets exceed gzip budget");
} else if (mode === "api") {
  const base = process.env.PERF_BASE_URL;
  if (!base) throw new Error("Set PERF_BASE_URL to the deployment being measured");
  const runs = Number(process.env.PERF_SAMPLES || 10);
  if (!Number.isInteger(runs) || runs < 5 || runs > 30) throw new Error("PERF_SAMPLES must be 5–30");
  for (const route of ["/api/health-check","/api/public/site-config","/api/public/platform-site-cms","/api/public/pricing?market=INTL"]) {
    const samples = [];
    for (let i=0;i<=runs;i++) {
      const start=performance.now();
      const response=await fetch(new URL(route,base),{signal:AbortSignal.timeout(10000),headers:{accept:"application/json"}});
      if (!response.ok) throw new Error(route+" HTTP "+response.status);
      await response.json();
      const elapsed=performance.now()-start;
      if (i>0) samples.push(elapsed);
    }
    const p95=percentile(samples,0.95);
    console.log(JSON.stringify({route,samples:runs,p50Ms:Math.round(percentile(samples,0.5)),p95Ms:Math.round(p95)}));
    if (process.env.STRICT_PERFORMANCE==="true" && p95>500) process.exitCode=1;
  }
} else throw new Error("Use bundle or api");
