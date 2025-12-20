declare const process: undefined | { env?: Record<string, string | undefined> };

export function readEnvVar(key: string): string | undefined {
  if (typeof process !== "undefined" && process?.env) {
    const value = process.env[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  if (typeof globalThis === "object" && globalThis) {
    const raw = (globalThis as Record<string, unknown>)[key];
    if (typeof raw === "string" && raw.length > 0) {
      return raw;
    }
  }

  return undefined;
}

export function readEnvPriority(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readEnvVar(key);
    if (value) {
      return value;
    }
  }
  return undefined;
}

export function readBindingVar(bindings: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!bindings) {
    return undefined;
  }
  const raw = bindings[key];
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}
