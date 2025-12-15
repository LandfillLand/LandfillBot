const scripts = [
  "./prepare-vercel-output.mjs",
  "./prepare-netlify-output.mjs"
];

for (const script of scripts) {
  await import(new URL(script, import.meta.url));
}
