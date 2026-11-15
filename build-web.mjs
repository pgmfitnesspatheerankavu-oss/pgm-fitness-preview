import fs from "node:fs";
import { build } from "esbuild";
import sharp from "sharp";

fs.rmSync("www", { recursive: true, force: true });
fs.mkdirSync("www/icons", { recursive: true });
for (const file of ["new-app.html","new-app.css","firebase-config.js","balance-calculator.js","access-policy.js","firebase-client.js","supabase-storage.js","cloud-data.js","cloud-data-policy.js","auth-policy.js","staff-management-policy.js","manifest.webmanifest","service-worker.js"]) {
  fs.copyFileSync(file, "www/" + (file === "new-app.html" ? "index.html" : file));
}
fs.copyFileSync("icons/icon.svg", "www/icons/icon.svg");
await sharp("icons/icon.svg").resize(512,512).png().toFile("www/icons/hyfit-icon-512.png");
await sharp("icons/icon.svg").resize(180,180).png().toFile("www/icons/apple-touch-icon.png");
await build({
  entryPoints: ["new-app.js"],
  outfile: "www/new-app.bundle.js",
  bundle: true,
  platform: "browser",
  format: "esm",
  target: ["es2022"],
  sourcemap: false,
  logLevel: "info"
});
console.log("HYFIT web assets and local Firebase bundle generated.");
