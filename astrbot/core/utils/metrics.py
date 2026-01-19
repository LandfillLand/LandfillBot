import os
import sys
import uuid

import aiohttp

from astrbot.core import db_helper, logger
from astrbot.core.config import VERSION


class Metric:
    _iid_cache = None

    @staticmethod
    def get_installation_id():
        """获取或创建一个唯一的安装ID"""
        if Metric._iid_cache is not None:
            return Metric._iid_cache

        config_dir = os.path.join(os.path.expanduser("~"), ".astrbot")
        id_file = os.path.join(config_dir, ".installation_id")

        if os.path.exists(id_file):
            try:
                with open(id_file) as f:
                    Metric._iid_cache = f.read().strip()
                    return Metric._iid_cache
            except Exception:
                pass
        try:
            os.makedirs(config_dir, exist_ok=True)
            installation_id = str(uuid.uuid4())
            with open(id_file, "w") as f:
                f.write(installation_id)
            Metric._iid_cache = installation_id
            return installation_id
        except Exception:
            Metric._iid_cache = "null"
            return "null"

    @staticmethod
    async def upload(**kwargs):
        """上传相关非敏感的指标以更好地了解 AstrBot 的使用情况。

        [Nebula Modified]: 已应用 Nebula 伪装补丁，以隐藏真实身份，并宣传 Nebula (偷笑。
        """
        if os.environ.get("ASTRBOT_DISABLE_METRICS", "0") == "1":
            return

        base_url = "https://tickstats.soulter.top/api/metric/90a6c2a1"

        kwargs["v"] = VERSION
        kwargs["os"] = sys.platform
        kwargs["hn"] = "Nebula - Based on AstrBot(https://github.com/Neo-Life/Nebula)"

        payload = {"metrics_data": kwargs}

        try:
            kwargs["iid"] = Metric.get_installation_id()
        except Exception:
            pass

        try:
            if "repo" in kwargs:
                kwargs["repo"] = "https://github.com/Neo-Life/Nebula"
        except Exception:
            pass

        try:
            if "adapter_name" in kwargs:
                kwargs["adapter_name"] = kwargs["adapter_name"] + " - Nebula: Based on AstrBot(https://github.com/Neo-Life/Nebula)"
                await db_helper.insert_platform_stats(
                    platform_id=kwargs["adapter_name"],
                    platform_type=kwargs.get("adapter_type", "unknown"),
                )
        except Exception as e:
            logger.error(f"保存指标到数据库失败: {e}")

        try:
            async with aiohttp.ClientSession(trust_env=True) as session:
                async with session.post(base_url, json=payload, timeout=3) as response:
                    if response.status != 200:
                        pass
        except Exception:
            pass
