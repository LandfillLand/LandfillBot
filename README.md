# i0c.cc

Universal redirect runtime for fetch-compatible edge platforms (Cloudflare Workers, Vercel Edge Functions, Netlify Edge Functions). It enforces HTTPS, serves a favicon, and applies redirect or proxy rules defined in a remote redirects.json file.

Live previews:
- Primary domain: https://i0c.cc
- Vercel deployment: https://i0c-cc.vercel.app
- Netlify deployment: https://i0c-cc.netlify.app

## One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository=https://github.com/IGCyukira/i0c.cc)  <br>
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/IGCyukira/i0c.cc)  <br>
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/IGCyukira/i0c.cc)

After deploying:
- Set `REDIRECTS_CONFIG_URL` or the repo/branch/path trio in your platform’s dashboard so the runtime can load the correct redirects.json.
- Sync secrets across environments if you override other handler options (for example cache bindings).
- Re-run `npm run build` locally when updating the shared redirect logic, then redeploy.

```
i0c.cc/
|-- src/
|   |-- lib/
|   |   `-- handler.ts
|   `-- platforms/
|       |-- cloudflare.ts
|       |-- netlify-edge.ts
|       `-- vercel-edge.ts
|-- dist/
|   `-- platforms/
|       `-- cloudflare.js
|-- package.json
|-- tsconfig.json
|-- tsconfig.build.json
|-- wrangler.toml
`-- ...
```

## Choose an adapter

- Cloudflare Workers: build [src/platforms/cloudflare.ts](src/platforms/cloudflare.ts) to dist/platforms/cloudflare.js; Wrangler runs `npm run build` automatically.
- Vercel Edge Functions: import the handler from [src/platforms/vercel-edge.ts](src/platforms/vercel-edge.ts).
- Netlify Edge Functions: deploy the bundle from [src/platforms/netlify-edge.ts](src/platforms/netlify-edge.ts) (or dist/netlify/edge-functions/redirects.js after `npm run build`).

Need a custom runtime? Import `handleRedirectRequest` from [src/lib/handler.ts](src/lib/handler.ts) and call it with your own `Request` object plus optional `HandlerOptions` (for example, override the config URL or provide a cache implementation).

Build for deployment with `npm run build`, then publish via `wrangler deploy`.

## Configure the redirects source

You can override the default GitHub location without touching the code. Set any of the environment variables below; the runtime will pick them up automatically on Cloudflare (Worker bindings) or Vercel (process.env).

- `REDIRECTS_CONFIG_URL` (fallback: `CONFIG_URL`) — absolute URL of the `redirects.json`. This short-circuits the repo/branch/path logic.
- `REDIRECTS_CONFIG_REPO` (fallback: `CONFIG_REPO`) — GitHub repo in `owner/name` form.
- `REDIRECTS_CONFIG_BRANCH` (fallback: `CONFIG_BRANCH`) — branch that hosts the data file.
- `REDIRECTS_CONFIG_PATH` (fallback: `CONFIG_PATH`) — path to the JSON file inside the repo.

If repo, branch, or path are provided (with or without a direct URL), the handler rebuilds the raw GitHub URL using [src/lib/handler.ts](src/lib/handler.ts#L24-L45). With no environment overrides, the defaults remain `IGCyukira/i0c.cc`, branch `data`, file `redirects.json`.

# `redirects.json` Quick Reference

Provide a `Slots` (or `slots` / `SLOT`) object in `redirects.json` to define all routing rules. The table below lists the available fields for each route:

| Field        | Type     | Default | Description |
|--------------|----------|---------|-------------|
| `type`       | string   | `prefix` | Route mode: `prefix` for prefix redirects, `exact` for exact matches, `proxy` for reverse proxying |
| `target`     | string   | `""`    | Destination URL (takes precedence over `to` / `url`) |
| `to` / `url` | string   | `""`    | Alias of `target`, can be used when `target` is omitted |
| `appendPath` | boolean  | `true`   | Whether to append the remaining path when using `prefix` mode |
| `status`     | number   | `302`    | HTTP status code for redirects (301 / 302 / 307 / 308, etc.) |
| `priority`   | number   | by order | Determines rule precedence for the same path; smaller numbers are matched first |

- Keys must start with `/` and can use colon parameters (such as `:id`) or the `*` wildcard; captures can be referenced in the target with `$1`, `:id`, and so on.
- The `proxy` type forwards the request to the destination and returns the upstream response; other types respond with a `Location` redirect.
- To configure multiple rules for the same path, provide an array. Array order controls the default priority, or you can specify `priority` explicitly. Smaller numbers match earlier.

Tip: add the schema reference below to unlock autocomplete and validation in supporting editors (the schema lives on `main`, so it still applies if the JSON sits in a data branch):

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/IGCyukira/i0c.cc/main/redirects.schema.json",
  "Slots": {
    // ...
  }
}
```

## Sample `redirects.json`

```jsonc
{
  "Slots": {
    // Fallback: send any unmatched path to the site homepage
    "/": "https://example.com",

    // Multiple rules for one path, with priority controlling the order
    "/docs/:page": [
      {
        "type": "exact",
        "target": "https://kb.example.com/:page",
        "status": 302,
        "priority": 1
      },
      {
        "type": "prefix",
        "target": "https://docs.example.com/:page",
        "appendPath": false,
        "status": 301,
        "priority": 5
      }
    ],

    // Simple redirect: campaign landing page
    "/promo": {
      "target": "https://example.com/campaign",
      "status": 308
    },

    // API example:
    //   1. /api matches the health check exactly and returns 200
    //   2. Other requests go to the primary API
    //   3. Failover to the backup API if the primary fails
    "/api": [
      {
        "type": "exact",
        "target": "https://status.example.com/healthz",
        "status": 200,
        "priority": 1
      },
      {
        "type": "proxy",
        "target": "https://api.example.com",
        "appendPath": true,
        "priority": 10
      },
      {
        "type": "proxy",
        "target": "https://backup-api.example.com",
        "appendPath": true,
        "priority": 20
      }
    ],

    // Wildcard: proxy /media/* to the CDN and keep the remainder of the path
    "/media/*": {
      "type": "proxy",
      "target": "https://cdn.example.com/$1",
      "status": 200
    },

    // Prefix redirect: admin console entry, keeping the original path
    "/admin": {
      "type": "prefix",
      "target": "https://console.example.com",
      "appendPath": true,
      "status": 307
    }
  }
}
```

After you commit the file, the Worker automatically applies these redirect and proxy rules.

For the Chinese version, see [README.zh-CN.md](README.zh-CN.md).
