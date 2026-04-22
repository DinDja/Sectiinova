const skipValue = process.env.NETLIFY_NEXT_PLUGIN_SKIP;
const normalizedSkip =
  typeof skipValue === "string" ? skipValue.trim().toLowerCase() : "";

if (normalizedSkip === "true") {
  console.error(
    [
      "[netlify-preflight] Build aborted: NETLIFY_NEXT_PLUGIN_SKIP=true.",
      "This disables the Next.js runtime on Netlify and causes production 404.",
      "Remove NETLIFY_NEXT_PLUGIN_SKIP from Site/Team environment variables and redeploy.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log(
  `[netlify-preflight] NETLIFY_NEXT_PLUGIN_SKIP=${skipValue ?? "<unset>"}`,
);
