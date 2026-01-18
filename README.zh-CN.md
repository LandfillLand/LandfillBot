# i0c.cc

面向 Cloudflare Workers、Vercel Edge Functions、Netlify Edge Functions 等 fetch 兼容边缘平台的通用脚本：负责强制 HTTPS、返回 favicon，并基于远程 redirects.json 中的规则执行重定向或代理。

在线预览：
- 主域名：https://i0c.cc
- Vercel 部署：https://vc.i0c.cc
- Netlify 部署：https://nf.i0c.cc

## 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository=https://github.com/IGCyukira/i0c.cc)  <br>
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/IGCyukira/i0c.cc)  <br>
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/IGCyukira/i0c.cc)  

部署完成后记得：
- 在目标平台的环境配置里设置 `REDIRECTS_CONFIG_URL` 或仓库/分支/路径三元组，让运行时代码能读取正确的 redirects.json。
- 如果覆盖了额外的处理选项（例如缓存绑定），请同步这些机密到各个环境。
- 更新公共重定向逻辑后在本地执行 `npm run build`，再触发重新部署。

## 选择适配器

- Cloudflare Workers：[src/platforms/cloudflare.ts](src/platforms/cloudflare.ts)  
- Vercel Edge Functions：[src/platforms/vercel-edge.ts](src/platforms/vercel-edge.ts)  
- Netlify Edge Functions：[src/platforms/netlify-edge.ts](src/platforms/netlify-edge.ts)  

需要自定义运行时？可从 [src/lib/handler.ts](src/lib/handler.ts) 引入 `handleRedirectRequest`，再配合 `HandlerOptions`（例如替换配置地址或注入自定义缓存实现）。

## 环境变量与配置

### SEO 配置

- `ROBOTS_POLICY`：控制 `robots.txt` 的策略。
  - 设为 `allow`：生成 `Allow: /` 并包含 `Sitemap.xml`。
  - 设为 默认或其他值：输出 `Disallow: /` 并省略 `Sitemap.xml`。

### 配置重定向数据源

无需改代码即可切换 `redirects.json` 的来源。只要在部署环境里设置以下任意变量即可，Cloudflare（Worker bindings）和 Vercel（process.env）都会被自动识别：

- `REDIRECTS_CONFIG_URL`（回退：`CONFIG_URL`）—— 指定 `redirects.json` 的完整 URL，会优先生效。
- `REDIRECTS_CONFIG_REPO`（回退：`CONFIG_REPO`）—— GitHub 仓库，格式为 `所有者/仓库名`。
- `REDIRECTS_CONFIG_BRANCH`（回退：`CONFIG_BRANCH`）—— 承载数据文件的分支。
- `REDIRECTS_CONFIG_PATH`（回退：`CONFIG_PATH`）—— 仓库内的文件路径。

如果提供了仓库 / 分支 / 路径，运行时会自动拼出 raw.githubusercontent.com 地址。未设置任何变量时，默认值仍为仓库 `IGCyukira/i0c.cc`、分支 `data`、文件 `redirects.json`。

### `redirects.json` 配置速查

现在可以部署[面板](https://github.com/IGCyukira/i0c.cc-webui)从而方便在线编辑 `redirects.json` 了。

在 `redirects.json` 中提供 `Slots`（或 `slots` / `SLOT`）对象即可定义所有规则。下表列出每条路由可用字段：

| 字段        | 类型     | 默认值  | 说明 |
|-------------|----------|---------|------|
| `type`      | string   | `prefix` | 路由模式：`prefix` 前缀重定向、`exact` 精确匹配、`proxy` 反向代理 |
| `target`    | string   | `""`    | 目标地址（`target` / `to` / `url` 三选一） |
| `to` / `url`| string   | `""`    | `target` 的别名字段（`target` / `to` / `url` 三选一） |
| `appendPath`| boolean  | `true`  | `prefix` / `proxy` 模式下是否拼接余下路径（`exact` 不支持） |
| `status`    | number   | `302`   | 非 `proxy` 响应的状态码（`proxy` 不要设置） |
| `priority`  | number   | 按顺序  | 同一路径存在多条规则时用于排序，数字越小优先级越高 |

- 键名需以 `/` 开头，可使用冒号参数（如 `:id`）或 `*` 通配符；匹配结果可在目标里用 `$1`、`:id` 等占位符。
- `proxy` 类型会把请求透传至目标并回传对方响应，其余类型返回 `Location` 重定向。
- 若需要为同一路径配置多条规则，可将值写成数组，数组顺序决定默认优先级，也可通过 `priority` 字段显式指定。数字越小越先匹配。

提示：在文件顶部添加下面的 Schema 引用，就能在支持的编辑器里获得自动补全和校验（Schema 放在 main 分支，即使 `redirects.json` 在 data 分支也能生效）：

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/IGCyukira/i0c.cc/main/redirects.schema.json",
  "Slots": {
    // ...
  }
}

```

#### 示例 `redirects.json`

```jsonc
{
  "Slots": {
    // 兜底：所有未命中的路径都会跳到站点首页
    "/": "https://example.com",

    // 同一路径配置多条规则，可通过 priority 控制优先级
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

    // 简单重定向：活动页
    "/promo": {
      "target": "https://example.com/campaign",
      "status": 308
    },

    // API 示例：
    //   1. /api 精确命中健康检查，直接返回 200
    //   2. 其余请求走主接口
    //   3. 主接口异常时回退到备份接口
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

    // 通配符：将 /media/* 透传到 CDN，并保留剩余路径
    "/media/*": {
      "type": "proxy",
      "target": "https://cdn.example.com/$1"
    },

    // 前缀重定向：后台入口，保持原路径
    "/admin": {
      "type": "prefix",
      "target": "https://console.example.com",
      "appendPath": true,
      "status": 307
    }
  }
}

```

将文件提交后，Worker 会自动按以上配置处理重定向与代理。
