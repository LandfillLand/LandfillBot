import asyncio
import copy
import traceback
from asyncio import Queue

from astrbot.core import logger
from astrbot.core.config.astrbot_config import AstrBotConfig
from astrbot.core.star.star_handler import EventType, star_handlers_registry, star_map
from astrbot.core.utils.webhook_utils import ensure_platform_webhook_config

from .platform import Platform, PlatformStatus
from .register import platform_cls_map
from .sources.webchat.webchat_adapter import WebChatAdapter


class PlatformManager:
    def __init__(self, config: AstrBotConfig, event_queue: Queue):
        self.platform_insts: list[Platform] = []
        """加载的 Platform 的实例"""

        self._inst_map: dict[str, dict] = {}
        self._platform_op_locks: dict[str, asyncio.Lock] = {}

        self._reload_debounce_tasks: dict[str, asyncio.Task] = {}
        self._reload_debounce_state: dict[str, dict] = {}

        self.astrbot_config = config
        self.platforms_config = config["platform"]
        self.settings = config["platform_settings"]
        """NOTE: 这里是 default 的配置文件，以保证最大的兼容性；
        这个配置中的 unique_session 需要特殊处理，
        约定整个项目中对 unique_session 的引用都从 default 的配置中获取"""
        self.event_queue = event_queue

    def _is_valid_platform_id(self, platform_id: str | None) -> bool:
        if not platform_id:
            return False
        return ":" not in platform_id and "!" not in platform_id

    def _sanitize_platform_id(self, platform_id: str | None) -> tuple[str | None, bool]:
        if not platform_id:
            return platform_id, False
        sanitized = platform_id.replace(":", "_").replace("!", "_")
        return sanitized, sanitized != platform_id

    def _get_platform_lock(self, platform_id: str) -> asyncio.Lock:
        lock = self._platform_op_locks.get(platform_id)
        if lock is None:
            lock = asyncio.Lock()
            self._platform_op_locks[platform_id] = lock
        return lock

    async def initialize(self):
        """初始化所有平台适配器"""
        for platform in self.platforms_config:
            try:
                if ensure_platform_webhook_config(platform):
                    self.astrbot_config.save_config()
                await self.load_platform(platform)
            except Exception as e:
                logger.error(f"初始化 {platform} 平台适配器失败: {e}")

        # 网页聊天
        webchat_inst = WebChatAdapter({}, self.settings, self.event_queue)
        self.platform_insts.append(webchat_inst)
        asyncio.create_task(
            self._task_wrapper(
                asyncio.create_task(webchat_inst.run(), name="webchat"),
                platform=webchat_inst,
            ),
        )

    async def _load_platform_unlocked(self, platform_config: dict):
        """实例化一个平台（调用方需确保已获取平台锁）"""
        # 动态导入
        try:
            if not platform_config["enable"]:
                return
            platform_id = platform_config.get("id")
            if not self._is_valid_platform_id(platform_id):
                sanitized_id, changed = self._sanitize_platform_id(platform_id)
                if sanitized_id and changed:
                    logger.warning(
                        "平台 ID %r 包含非法字符 ':' 或 '!'，已替换为 %r。",
                        platform_id,
                        sanitized_id,
                    )
                    platform_config["id"] = sanitized_id
                    self.astrbot_config.save_config()
                else:
                    logger.error(
                        f"平台 ID {platform_id!r} 不能为空，跳过加载该平台适配器。",
                    )
                    return

            platform_id = platform_config.get("id")
            if platform_id and platform_id in self._inst_map:
                logger.warning(
                    f"检测到平台 {platform_id} 已加载，正在先终止旧实例以避免重复连接...",
                )
                await self._terminate_platform_unlocked(platform_id)

            logger.info(
                f"载入 {platform_config['type']}({platform_config['id']}) 平台适配器 ...",
            )
            match platform_config["type"]:
                case "aiocqhttp":
                    from .sources.aiocqhttp.aiocqhttp_platform_adapter import (
                        AiocqhttpAdapter,  # noqa: F401
                    )
                case "qq_official":
                    from .sources.qqofficial.qqofficial_platform_adapter import (
                        QQOfficialPlatformAdapter,  # noqa: F401
                    )
                case "qq_official_webhook":
                    from .sources.qqofficial_webhook.qo_webhook_adapter import (
                        QQOfficialWebhookPlatformAdapter,  # noqa: F401
                    )
                case "lark":
                    from .sources.lark.lark_adapter import (
                        LarkPlatformAdapter,  # noqa: F401
                    )
                case "dingtalk":
                    from .sources.dingtalk.dingtalk_adapter import (
                        DingtalkPlatformAdapter,  # noqa: F401
                    )
                case "telegram":
                    from .sources.telegram.tg_adapter import (
                        TelegramPlatformAdapter,  # noqa: F401
                    )
                case "wecom":
                    from .sources.wecom.wecom_adapter import (
                        WecomPlatformAdapter,  # noqa: F401
                    )
                case "wecom_ai_bot":
                    from .sources.wecom_ai_bot.wecomai_adapter import (
                        WecomAIBotAdapter,  # noqa: F401
                    )
                case "weixin_official_account":
                    from .sources.weixin_official_account.weixin_offacc_adapter import (
                        WeixinOfficialAccountPlatformAdapter,  # noqa: F401
                    )
                case "discord":
                    from .sources.discord.discord_platform_adapter import (
                        DiscordPlatformAdapter,  # noqa: F401
                    )
                case "misskey":
                    from .sources.misskey.misskey_adapter import (
                        MisskeyPlatformAdapter,  # noqa: F401
                    )
                case "slack":
                    from .sources.slack.slack_adapter import SlackAdapter  # noqa: F401
                case "satori":
                    from .sources.satori.satori_adapter import (
                        SatoriPlatformAdapter,  # noqa: F401
                    )
        except (ImportError, ModuleNotFoundError) as e:
            logger.error(
                f"加载平台适配器 {platform_config['type']} 失败，原因：{e}。请检查依赖库是否安装。提示：可以在 管理面板->平台日志->安装Pip库 中安装依赖库。",
            )
        except Exception as e:
            logger.error(f"加载平台适配器 {platform_config['type']} 失败，原因：{e}。")

        if platform_config["type"] not in platform_cls_map:
            logger.error(
                f"未找到适用于 {platform_config['type']}({platform_config['id']}) 平台适配器，请检查是否已经安装或者名称填写错误",
            )
            return
        cls_type = platform_cls_map[platform_config["type"]]
        inst: Platform = cls_type(platform_config, self.settings, self.event_queue)
        self._inst_map[platform_config["id"]] = {
            "inst": inst,
            "client_id": inst.client_self_id,
        }
        self.platform_insts.append(inst)

        asyncio.create_task(
            self._task_wrapper(
                asyncio.create_task(
                    inst.run(),
                    name=f"platform_{platform_config['type']}_{platform_config['id']}",
                ),
                platform=inst,
            ),
        )
        handlers = star_handlers_registry.get_handlers_by_event_type(
            EventType.OnPlatformLoadedEvent,
        )
        for handler in handlers:
            try:
                logger.info(
                    f"hook(on_platform_loaded) -> {star_map[handler.handler_module_path].name} - {handler.handler_name}",
                )
                await handler.handler()
            except Exception:
                logger.error(traceback.format_exc())

    async def load_platform(self, platform_config: dict):
        """实例化一个平台"""
        platform_id = platform_config.get("id")
        if not platform_id:
            # 没有 id 时无法做并发保护，保持原有行为
            await self._load_platform_unlocked(platform_config)
            return

        async with self._get_platform_lock(platform_id):
            await self._load_platform_unlocked(platform_config)

    async def _task_wrapper(self, task: asyncio.Task, platform: Platform | None = None):
        # 设置平台状态为运行中
        if platform:
            platform.status = PlatformStatus.RUNNING

        try:
            await task
        except asyncio.CancelledError:
            if platform:
                platform.status = PlatformStatus.STOPPED
        except Exception as e:
            error_msg = str(e)
            tb_str = traceback.format_exc()
            logger.error(f"------- 任务 {task.get_name()} 发生错误: {e}")
            for line in tb_str.split("\n"):
                logger.error(f"|    {line}")
            logger.error("-------")

            # 记录错误到平台实例
            if platform:
                platform.record_error(error_msg, tb_str)

    async def reload(self, platform_config: dict):
        platform_id = platform_config.get("id")
        if platform_id:
            async with self._get_platform_lock(platform_id):
                await self._terminate_platform_unlocked(platform_id)
                if platform_config["enable"]:
                    await self._load_platform_unlocked(platform_config)
        else:
            await self.terminate_platform(platform_config["id"])
            if platform_config["enable"]:
                await self.load_platform(platform_config)

        # 和配置文件保持同步
        config_ids = [provider["id"] for provider in self.platforms_config]
        for key in list(self._inst_map.keys()):
            if key not in config_ids:
                await self.terminate_platform(key)

    async def reload_debounced(self, platform_config: dict, debounce_sec: float = 0.35):
        """对平台重载做去抖：同一 platform_id 在 debounce 窗口内只执行一次实际 reload。

        语义：
        - 多次调用会合并，最终仅使用最后一次传入的配置。
        - 同一平台的并发调用会等待同一个结果。
        """

        platform_id = platform_config.get("id")
        if not platform_id:
            # 没有 id 时无法合并，保持原有行为
            await self.reload(platform_config)
            return

        state = self._reload_debounce_state.get(platform_id)
        if state is None or state.get("future") is None or state["future"].done():
            loop = asyncio.get_running_loop()
            future: asyncio.Future = loop.create_future()
            state = {"future": future, "latest_config": copy.deepcopy(platform_config)}
            self._reload_debounce_state[platform_id] = state
        else:
            # 复用同一个 future，让所有请求等待同一个最终重载
            state["latest_config"] = copy.deepcopy(platform_config)

        # 取消旧的计时任务（仅取消计时，不取消 future）
        old_task = self._reload_debounce_tasks.get(platform_id)
        if old_task and not old_task.done():
            old_task.cancel()

        async def _runner():
            try:
                await asyncio.sleep(debounce_sec)
                latest_config = state["latest_config"]
                await self.reload(latest_config)
                if not state["future"].done():
                    state["future"].set_result(None)
            except asyncio.CancelledError:
                # 被新的更新覆盖，正常退出
                return
            except Exception as exc:
                if not state["future"].done():
                    state["future"].set_exception(exc)

        self._reload_debounce_tasks[platform_id] = asyncio.create_task(_runner())
        await state["future"]

    async def _terminate_platform_unlocked(self, platform_id: str):
        """终止一个平台（调用方需确保已获取平台锁）"""
        if platform_id not in self._inst_map:
            return

        logger.info(f"正在尝试终止 {platform_id} 平台适配器 ...")

        info = self._inst_map.pop(platform_id)
        inst: Platform = info["inst"]

        try:
            self.platform_insts.remove(inst)
        except Exception:
            logger.warning(f"可能未完全移除 {platform_id} 平台适配器")

        if getattr(inst, "terminate", None):
            await inst.terminate()

    async def terminate_platform(self, platform_id: str):
        async with self._get_platform_lock(platform_id):
            await self._terminate_platform_unlocked(platform_id)

    async def terminate(self):
        for inst in self.platform_insts:
            if getattr(inst, "terminate", None):
                await inst.terminate()

    def get_insts(self):
        return self.platform_insts

    def get_all_stats(self) -> dict:
        """获取所有平台的统计信息

        Returns:
            包含所有平台统计信息的字典
        """
        stats_list = []
        total_errors = 0
        running_count = 0
        error_count = 0

        for inst in self.platform_insts:
            try:
                stat = inst.get_stats()
                stats_list.append(stat)
                total_errors += stat.get("error_count", 0)
                if stat.get("status") == PlatformStatus.RUNNING.value:
                    running_count += 1
                elif stat.get("status") == PlatformStatus.ERROR.value:
                    error_count += 1
            except Exception as e:
                # 如果获取统计信息失败，记录基本信息
                logger.warning(f"获取平台统计信息失败: {e}")
                stats_list.append(
                    {
                        "id": getattr(inst, "config", {}).get("id", "unknown"),
                        "type": "unknown",
                        "status": "unknown",
                        "error_count": 0,
                        "last_error": None,
                    }
                )

        return {
            "platforms": stats_list,
            "summary": {
                "total": len(stats_list),
                "running": running_count,
                "error": error_count,
                "total_errors": total_errors,
            },
        }
