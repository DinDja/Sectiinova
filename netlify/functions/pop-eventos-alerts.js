import { json, runPopEventosAlertsJob } from "./popEventosAlertsShared.js";

export const config = {
  schedule: "0 * * * *",
};

export async function handler() {
  console.info("[pop-eventos-alerts] Scheduled run started", {
    timestamp: new Date().toISOString(),
  });

  try {
    const summary = await runPopEventosAlertsJob();
    console.info("[pop-eventos-alerts] Scheduled run finished", summary);
    return json(200, summary);
  } catch (error) {
    console.error("[pop-eventos-alerts] Scheduled run failed", error);
    return json(500, {
      error:
        error instanceof Error
          ? error.message
          : "Falha inesperada ao executar alertas automaticos do calendario POP.",
    });
  }
}
