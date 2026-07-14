const urls = [
  "https://miclubchile.cl",
  "https://app.miclubchile.cl",
  "https://comercio.miclubchile.cl",
  "https://cajero.miclubchile.cl",
  "https://admin.miclubchile.cl",
  "https://api.miclubchile.cl/health",
  "https://api.miclubchile.cl/api/health",
  "https://api.miclubchile.cl/api/health/live",
  "https://api.miclubchile.cl/api/health/ready",
];

async function probe(url: string) {
  const started = Date.now();
  try {
    const response = await fetch(url, { redirect: "follow" });
    const body = await response.text();
    return {
      url,
      status: response.status,
      ok: response.ok,
      https: url.startsWith("https://"),
      responseTimeMs: Date.now() - started,
      bodyPreview: body.slice(0, 120).replace(/\s+/g, " "),
    };
  } catch (error) {
    return {
      url,
      status: "ERROR",
      ok: false,
      https: url.startsWith("https://"),
      responseTimeMs: Date.now() - started,
      error: error instanceof Error ? error.message : "unknown",
    };
  }
}

async function run() {
  const results = await Promise.all(urls.map(probe));
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    destructive: false,
    productionModified: false,
    results,
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
