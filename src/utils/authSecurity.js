export const PASSWORD_MIN_LENGTH = 6;

const GENERIC_LOGIN_ERROR =
  "Não foi possível autenticar com os dados informados.";
const GENERIC_REGISTER_ERROR =
  "Não foi possível concluir o cadastro com os dados informados.";

const WEAK_PASSWORD_FRAGMENTS = [
  "1234",
  "abcd",
  "qwer",
  "senha",
  "password",
  "admin",
];

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getEmailLocalPart(email) {
  const normalized = normalizeText(email);
  if (!normalized.includes("@")) return "";
  return normalized.split("@")[0] || "";
}

function getNameTokens(fullName) {
  return normalizeText(fullName)
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ""))
    .filter((token) => token.length >= 4);
}

function hasRepeatedCharacters(password) {
  return /(.)\1{3,}/i.test(String(password || ""));
}

function hasObviousSequence(password) {
  const normalized = normalizeText(password);
  return WEAK_PASSWORD_FRAGMENTS.some((fragment) =>
    normalized.includes(fragment),
  );
}

export function getPasswordSecurityChecks(password, context = {}) {
  const normalizedPassword = String(password || "");
  const normalizedPasswordLower = normalizeText(normalizedPassword);
  const emailLocalPart = getEmailLocalPart(context.email);
  const nameTokens = getNameTokens(context.fullName);

  return [
    {
      id: "length",
      label: `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`,
      passed: normalizedPassword.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: "email",
      label: "Não conter parte relevante do e-mail",
      passed:
        !emailLocalPart ||
        emailLocalPart.length < 4 ||
        !normalizedPasswordLower.includes(emailLocalPart),
    },
    {
      id: "name",
      label: "Não conter seu nome",
      passed: !nameTokens.some((token) => normalizedPasswordLower.includes(token)),
    },
    {
      id: "patterns",
      label: "Sem sequências óbvias ou repetições longas",
      passed:
        !hasObviousSequence(normalizedPasswordLower) &&
        !hasRepeatedCharacters(normalizedPassword),
    },
  ];
}

export function getPasswordStrength(password, context = {}) {
  const checks = getPasswordSecurityChecks(password, context);
  const totalPassed = checks.filter((check) => check.passed).length;

  if (!String(password || "")) {
    return { label: "Vazia", tone: "slate" };
  }

  if (totalPassed === checks.length) {
    return { label: "Forte", tone: "emerald" };
  }

  if (totalPassed >= checks.length - 1) {
    return { label: "Aceitável", tone: "amber" };
  }

  return { label: "Fraca", tone: "rose" };
}

export function validateRegistrationPassword(password, context = {}) {
  const checks = getPasswordSecurityChecks(password, context);
  const failedCheckIds = checks
    .filter((check) => !check.passed)
    .map((check) => check.id);

  if (failedCheckIds.length === 0) {
    return "";
  }

  if (failedCheckIds.includes("length")) {
    return `Use uma senha com pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }

  if (failedCheckIds.includes("email")) {
    return "A senha não pode conter partes do seu e-mail.";
  }

  if (failedCheckIds.includes("name")) {
    return "A senha não pode conter seu nome.";
  }

  return "Use uma senha mais difícil de adivinhar, sem padrões óbvios.";
}

export function shouldRequireEmailVerification(user) {
  const providers = Array.isArray(user?.providerData)
    ? user.providerData.map((provider) => String(provider?.providerId || ""))
    : [];

  return providers.includes("password") && user?.emailVerified === false;
}

export function getAuthErrorMessage(
  code,
  fallbackMessage = "",
  options = {},
) {
  const operation = String(options.operation || "login").trim().toLowerCase();
  const messages = {
    "auth/email-already-in-use":
      "Se já existir uma conta para este e-mail, faça login ou redefina a senha.",
    "auth/weak-password": `Use uma senha com pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    "auth/invalid-email": "Informe um e-mail válido.",
    "auth/too-many-requests":
      "Muitas tentativas detectadas. Aguarde alguns minutos antes de tentar novamente.",
    "auth/popup-closed-by-user":
      "A janela de autenticação foi fechada antes da conclusão.",
    "auth/cancelled-popup-request": "A autenticação foi cancelada.",
    "auth/popup-blocked":
      "O navegador bloqueou a janela de autenticação. Habilite pop-ups e tente novamente.",
    "auth/account-exists-with-different-credential":
      "Já existe uma conta com este e-mail usando outro método de login.",
    "auth/network-request-failed":
      "Falha de conexão. Verifique sua internet e tente novamente.",
  };

  if (
    [
      "auth/user-not-found",
      "auth/wrong-password",
      "auth/invalid-credential",
      "auth/invalid-login-credentials",
      "auth/user-disabled",
    ].includes(String(code || ""))
  ) {
    return operation === "register"
      ? GENERIC_REGISTER_ERROR
      : GENERIC_LOGIN_ERROR;
  }

  if (code && messages[code]) {
    return messages[code];
  }

  const normalizedFallback = String(fallbackMessage || "").trim();
  if (normalizedFallback) {
    return normalizedFallback;
  }

  return operation === "register"
    ? GENERIC_REGISTER_ERROR
    : GENERIC_LOGIN_ERROR;
}
