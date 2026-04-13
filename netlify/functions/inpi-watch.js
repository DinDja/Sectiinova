import { json, runWatchJob } from "./inpiWatchShared.js";

export const config = {
  schedule: "*/30 * * * *",
}

export async function handler() {
  console.info("[inpi-watch] Scheduled run started", {
    timestamp: new Date().toISOString(),
  });

  try {
    const summary = await runWatchJob();
    console.info("[inpi-watch] Scheduled run finished", summary);
    return json(200, summary);
  } catch (error) {
    console.error("[inpi-watch] Scheduled run failed", error);
    return json(500, {
      error:
        error instanceof Error
          ? error.message
          : "Falha inesperada ao executar o monitoramento automático do INPI.",
    });
  }
}
