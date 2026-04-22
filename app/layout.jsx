import "../src/style.css";

export const metadata = {
  title: "Conecta Juvs | SECTI BA - plataforma de inovacao e colaboracao",
  description:
    "Conecta Juvs da SECTI BA: plataforma de inovacao, gestao de projetos e colaboracao para clubes e redes de pesquisa.",
  keywords: [
    "Conecta Juvs",
    "SECTI BA",
    "inovacao",
    "projetos",
    "clubes",
    "colaboracao",
    "rede de pesquisa",
    "Bahia",
  ],
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "MyWebSite",
  },
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
