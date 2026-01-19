import argparse
import asyncio
import mimetypes
import os
import sys
from pathlib import Path

from astrbot.core import LogBroker, LogManager, db_helper, logger
from astrbot.core.config.default import VERSION
from astrbot.core.initial_loader import InitialLoader
from astrbot.core.utils.astrbot_path import get_astrbot_data_path
from astrbot.core.utils.io import (
    download_dashboard,
    download_nebula_dashboard_nightly,
    get_dashboard_channel,
    get_dashboard_version,
)

# 将父目录添加到 sys.path
sys.path.append(Path(__file__).parent.as_posix())

logo_tmpl = r"""


 ██████   █████          █████                ████
░░██████ ░░███          ░░███                ░░███
 ░███░███ ░███   ██████  ░███████  █████ ████ ░███   ██████
 ░███░░███░███  ███░░███ ░███░░███░░███ ░███  ░███  ░░░░░███
 ░███ ░░██████ ░███████  ░███ ░███ ░███ ░███  ░███   ███████
 ░███  ░░█████ ░███░░░   ░███ ░███ ░███ ░███  ░███  ███░░███
 █████  ░░█████░░██████  ████████  ░░████████ █████░░████████
░░░░░    ░░░░░  ░░░░░░  ░░░░░░░░    ░░░░░░░░ ░░░░░  ░░░░░░░░

"""


def check_env():
    if not (sys.version_info.major == 3 and sys.version_info.minor >= 10):
        logger.error("请使用 Python3.10+ 运行本项目。")
        exit()

    os.makedirs("data/config", exist_ok=True)
    os.makedirs("data/plugins", exist_ok=True)
    os.makedirs("data/temp", exist_ok=True)

    # 针对问题 #181 的临时解决方案
    mimetypes.add_type("text/javascript", ".js")
    mimetypes.add_type("text/javascript", ".mjs")
    mimetypes.add_type("application/json", ".json")


async def check_dashboard_files(webui_dir: str | None = None):
    """下载管理面板文件"""
    # 指定webui目录
    if webui_dir:
        if os.path.exists(webui_dir):
            logger.info(f"使用指定的 WebUI 目录: {webui_dir}")
            return webui_dir
        logger.warning(f"指定的 WebUI 目录 {webui_dir} 不存在，将使用默认逻辑。")

    data_dist_path = os.path.join(get_astrbot_data_path(), "dist")
    if os.path.exists(data_dist_path):
        v = await get_dashboard_version()
        if v is not None:
            # 存在文件
            if v == f"v{VERSION}":
                logger.info("WebUI 版本已是最新。")
            else:
                logger.warning(
                    f"检测到 WebUI 版本 ({v}) 与当前 AstrBot 版本 (v{VERSION}) 不符。",
                )
        return data_dist_path

    channel = get_dashboard_channel()
    if channel == "nebula":
        logger.info(
            "开始下载管理面板文件（Nebula Nightly）...如多次下载失败，请前往 release tag nightly 下载 dist.zip，并将其中的 dist 文件夹解压至 data 目录下。",
        )
    else:
        logger.info(
            "开始下载管理面板文件...高峰期（晚上）可能导致较慢的速度。如多次下载失败，请前往 https://github.com/AstrBotDevs/AstrBot/releases/latest 下载 dist.zip，并将其中的 dist 文件夹解压至 data 目录下。",
        )

    try:
        if channel == "nebula":
            await download_nebula_dashboard_nightly()
        else:
            await download_dashboard(version=f"v{VERSION}", latest=False)
    except Exception as e:
        logger.critical(f"下载管理面板文件失败: {e}。")
        return None

    logger.info("管理面板下载完成。")
    return data_dist_path


async def run_astrbot(webui_dir: str | None = None):
    # 检查仪表板文件
    resolved_webui_dir = await check_dashboard_files(webui_dir)

    db = db_helper

    # 打印 logo
    logger.info(logo_tmpl)

    core_lifecycle = InitialLoader(db, log_broker)
    core_lifecycle.webui_dir = resolved_webui_dir

    try:
        await core_lifecycle.start()
    except asyncio.CancelledError:
        # asyncio.run 在 Ctrl+C 时会取消主协程；这里做优雅清理。
        logger.info("收到退出信号，正在优雅关闭...")
        try:
            await core_lifecycle.stop()
        except Exception as e:
            logger.error(f"优雅关闭失败: {e}")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AstrBot")
    parser.add_argument(
        "--webui-dir",
        type=str,
        help="指定 WebUI 静态文件目录路径",
        default=None,
    )
    args = parser.parse_args()

    check_env()

    # 启动日志代理
    log_broker = LogBroker()
    LogManager.set_queue_handler(logger, log_broker)

    try:
        asyncio.run(run_astrbot(args.webui_dir))
    except KeyboardInterrupt:
        # 避免打印 traceback；退出码保持为 0
        logger.info("已退出。")
