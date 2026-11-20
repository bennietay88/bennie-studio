import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";

const repositoryRoot = process.cwd();

test("Vercel-style emitted monthly report modules resolve their ESM imports", async () => {
  const outputRoot = await mkdtemp(path.join(path.resolve("/tmp"), "bennie-vercel-esm-"));
  try {
    await build({
      absWorkingDir: repositoryRoot,
      entryPoints: ["server/monthlyGrowthReports.ts", "src/lib/monthlyGrowthReportWorkflow.ts"],
      outbase: ".",
      outdir: outputRoot,
      bundle: false,
      format: "esm",
      platform: "node",
      target: "node24",
    });
    await writeFile(path.join(outputRoot, "package.json"), JSON.stringify({ type: "module" }));

    const emittedModule = path.join(outputRoot, "server/monthlyGrowthReports.js");
    const emittedSource = await readFile(emittedModule, "utf8");
    assert.match(emittedSource, /monthlyGrowthReportWorkflow\.js/);
    assert.doesNotMatch(emittedSource, /monthlyGrowthReportWorkflow\.ts/);

    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", `const m = await import(${JSON.stringify(pathToFileURL(emittedModule).href)}); if (typeof m.generateMonthlyGrowthReportDrafts !== "function") process.exit(2);`],
      { cwd: outputRoot, encoding: "utf8" },
    );
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
});

test("the actual API entrypoint imports under Node 24 with preview-like missing Supabase config", async () => {
  const cwd = await mkdtemp(path.join(path.resolve("/tmp"), "bennie-api-entrypoint-"));
  try {
    const entrypoint = path.join(repositoryRoot, "api/index.ts");
    const tsxLoader = path.join(repositoryRoot, "node_modules/tsx/dist/loader.mjs");
    const script = `
      const module = await import(${JSON.stringify(pathToFileURL(entrypoint).href)});
      const routes = module.default._router.stack.flatMap((layer) => layer.route ? [layer.route.path] : []);
      const healthRegistered = routes.some((route) => route === "/api/health-check" || (Array.isArray(route) && route.includes("/api/health-check")));
      const ready = healthRegistered && routes.includes("/api/system/status");
      console.log(JSON.stringify({ moduleLoaded: true, routesRegistered: ready }));
      if (!ready) process.exitCode = 3;
    `;
    const result = spawnSync(
      process.execPath,
      ["--import", tsxLoader, "--input-type=module", "-e", script],
      {
        cwd,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH || "",
          NODE_ENV: "production",
          VERCEL: "1",
          VITE_SUPABASE_URL: "",
          VITE_SUPABASE_ANON_KEY: "",
          SUPABASE_SERVICE_ROLE_KEY: "",
        },
      },
    );
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /"moduleLoaded":true,"routesRegistered":true/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
