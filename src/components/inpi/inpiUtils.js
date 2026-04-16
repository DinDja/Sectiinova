export function buildProfessorFolderId(loggedUser) {
  const rawId =
    loggedUser?.id ||
    loggedUser?.uid ||
    loggedUser?.email ||
    loggedUser?.nome ||
    "professor_anonimo";

  return (
    String(rawId)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "professor_anonimo"
  );
}

export function sanitizeFilePart(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

export function formatDateTimeCompact(isoDate) {
  const date = new Date(isoDate);
  const pad = (n) => String(n).padStart(2, "0");

  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
    date.getDate(),
  )}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function mergeChecklistTasks(baseTasks, remoteTasks) {
  if (!Array.isArray(remoteTasks)) {
    return baseTasks;
  }

  const remoteTasksById = new Map(remoteTasks.map((task) => [task.id, task]));
  const knownIds = new Set(baseTasks.map((task) => task.id));

  return [
    ...baseTasks.map((task) => {
      const persistedTask = remoteTasksById.get(task.id);

      if (!persistedTask) {
        return task;
      }

      return {
        ...task,
        done: Boolean(persistedTask.done),
      };
    }),
    ...remoteTasks.filter((task) => !knownIds.has(task.id)),
  ];
}
