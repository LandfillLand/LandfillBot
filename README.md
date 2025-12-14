# 重定向配置速查

在 `redirects.json` 中提供 `Slots`（或 `slots` / `SLOT`）对象即可定义所有规则。下表列出每条路由可用字段：

| 字段        | 类型     | 默认值  | 说明 |
|-------------|----------|---------|------|
| `type`      | string   | `prefix` | 路由模式：`prefix` 前缀重定向、`exact` 精确匹配、`proxy` 反向代理 |
| `target`    | string   | `""`    | 目标地址（优先于 `to` / `url`） |
| `to` / `url`| string   | `""`    | `target` 的别名，缺省时可使用 |
| `appendPath`| boolean  | `true`   | `prefix` 模式下是否拼接余下路径 |
| `status`    | number   | `302`    | 重定向状态码（301 / 302 / 307 / 308 等） |

- 键名需以 `/` 开头，可使用冒号参数（如 `:id`）或 `*` 通配符；匹配结果可在目标里用 `$1`、`:id` 等占位符。
- `proxy` 类型会把请求透传至目标并回传对方响应，其余类型返回 `Location` 重定向。

## 示例 `redirects.json`

```json
{
  "Slots": {
    "/": "https://example.com",
    "/docs/:page": {
      "target": "https://docs.example.com/:page",
      "type": "exact",
      "status": 301
    },
    "/promo": {
      "target": "https://example.com/campaign",
      "status": 308
    },
    "/api": {
      "type": "proxy",
      "target": "https://api.example.com",
      "appendPath": true
    }
  }
}
```

将文件提交后，Worker 会自动按以上配置处理重定向与代理。
