import { readBindingVar, readEnvPriority } from "./env";

const ENV_CONFIG_REPO = readEnvPriority(["REDIRECTS_CONFIG_REPO", "CONFIG_REPO"]);
const ENV_CONFIG_BRANCH = readEnvPriority(["REDIRECTS_CONFIG_BRANCH", "CONFIG_BRANCH"]);
const ENV_CONFIG_PATH = readEnvPriority(["REDIRECTS_CONFIG_PATH", "CONFIG_PATH"]);
const CONFIG_REPO = ENV_CONFIG_REPO ?? "IGCyukira/i0c.cc";
const CONFIG_BRANCH = ENV_CONFIG_BRANCH ?? "data";
const CONFIG_PATH = ENV_CONFIG_PATH ?? "redirects.json";

export function buildConfigUrl(parts?: { repo?: string; branch?: string; path?: string }): string {
  const repo = parts?.repo ?? CONFIG_REPO;
  const branch = parts?.branch ?? CONFIG_BRANCH;
  const path = parts?.path ?? CONFIG_PATH;
  return `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
}

const ENV_CONFIG_URL = readEnvPriority(["REDIRECTS_CONFIG_URL", "CONFIG_URL"]);
export const DEFAULT_CONFIG_URL = ENV_CONFIG_URL ?? buildConfigUrl();

export function resolveConfigUrlFromBindings(bindings?: Record<string, unknown>): string | undefined {
  if (bindings && typeof bindings === "object") {
    const direct = readBindingVar(bindings, "REDIRECTS_CONFIG_URL") ?? readBindingVar(bindings, "CONFIG_URL");
    if (direct) {
      return direct;
    }

    const repo = readBindingVar(bindings, "REDIRECTS_CONFIG_REPO") ?? readBindingVar(bindings, "CONFIG_REPO");
    const branch = readBindingVar(bindings, "REDIRECTS_CONFIG_BRANCH") ?? readBindingVar(bindings, "CONFIG_BRANCH");
    const path = readBindingVar(bindings, "REDIRECTS_CONFIG_PATH") ?? readBindingVar(bindings, "CONFIG_PATH");

    if (repo || branch || path) {
      return buildConfigUrl({ repo: repo ?? undefined, branch: branch ?? undefined, path: path ?? undefined });
    }
  }

  return ENV_CONFIG_URL ?? undefined;
}
