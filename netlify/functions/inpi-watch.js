import { json, runWatchJob } from "./inpiWatchShared.js";

export const config = {
  schedule: "*/30 * * * *",
}

export async function handler() {
  try {
    const summary = await runWatchJob();
    return json(200, summary);
  } catch (error) {
    return json(500, {
      error:
        error instanceof Error
          ? error.message
          : "Falha inesperada ao executar o monitoramento automático do INPI.",
    });
  }
}