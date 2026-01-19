from quart import request
from werkzeug.exceptions import NotFound

from .route import Route, RouteContext

HELP_TEXT = (
    "404 Not found。\n\n"
    "如果你初次使用打开面板发现 404, 说明前端文件未编译或未放置在正确位置，请参考文档: https://astrbot.app/faq.html\n"
    "如果你正在测试回调地址可达性，显示这段文字说明测试成功了。"
)


class StaticFileRoute(Route):
    def __init__(self, context: RouteContext) -> None:
        super().__init__(context)

        self.app.add_url_rule("/", view_func=self.index)

        @self.app.errorhandler(404)
        async def page_not_found(e):
            # 1. API 接口请求 -> 返回 JSON 404
            if request.path.startswith("/api"):
                return {"status": "error", "message": "API endpoint not found"}, 404

            # 2. 其他请求（可能是页面，也可能是回调测试）
            return await self._serve_index_or_text()

    async def index(self):
        # 根路径请求
        return await self._serve_index_or_text()

    async def _serve_index_or_text(self):
        """核心逻辑：尝试返回前端页面，如果失败或客户端不需要页面，则返回提示文本"""

        # 判断客户端是否明确表示想要 HTML (浏览器通常都会带 text/html)
        accepts_html = "text/html" in request.headers.get("Accept", "")

        try:
            # 只有当客户端是浏览器(接受HTML) 时，才尝试发送 SPA 页面
            # 如果是 curl 或者简单的 socket 连接，通常不包含 Accept: text/html，会跳过这里直接返回文本
            # 你也可以去掉 accepts_html 判断，让所有非 API 请求都优先尝试返回 index.html
            if accepts_html:
                return await self.app.send_static_file("index.html")
            else:
                # 如果客户端似乎不是浏览器（比如是回调测试工具），直接返回文本
                return HELP_TEXT, 200

        except NotFound:
            # 【关键】如果 index.html 文件根本不存在（用户没编译前端），
            # 无论客户端是谁，都捕获异常并返回提示文本。
            return HELP_TEXT, 404
