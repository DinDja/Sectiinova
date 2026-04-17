import { describe, expect, it } from "vitest";

import {
  getAuthErrorMessage,
  getPasswordStrength,
  shouldRequireEmailVerification,
  validateRegistrationPassword,
} from "../authSecurity";

describe("authSecurity", () => {
  it("exige senha longa no cadastro", () => {
    expect(
      validateRegistrationPassword("curta", {
        email: "usuario@exemplo.com",
        fullName: "Usuario Teste",
      }),
    ).toContain("pelo menos");
  });

  it("bloqueia senha contendo parte do email", () => {
    expect(
      validateRegistrationPassword("usuario-super-segura-2026", {
        email: "usuario@exemplo.com",
        fullName: "Usuario Teste",
      }),
    ).toContain("e-mail");
  });

  it("retorna erro genérico no login para evitar enumeração", () => {
    expect(
      getAuthErrorMessage("auth/user-not-found", "", { operation: "login" }),
    ).toBe("Não foi possível autenticar com os dados informados.");
  });

  it("identifica necessidade de verificação de email para provedor senha", () => {
    expect(
      shouldRequireEmailVerification({
        emailVerified: false,
        providerData: [{ providerId: "password" }],
      }),
    ).toBe(true);
  });

  it("classifica senha forte quando requisitos são atendidos", () => {
    expect(
      getPasswordStrength("frase-super-unica-2026", {
        email: "outro@exemplo.com",
        fullName: "Pessoa Diferente",
      }).label,
    ).toBe("Forte");
  });
});
