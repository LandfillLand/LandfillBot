from pathlib import Path

import click


def check_astrbot_root(path: str | Path) -> bool:
    """检查路径是否为 AstrBot 根目录"""
    if not isinstance(path, Path):
        path = Path(path)
    if not path.exists() or not path.is_dir():
        return False
    if not (path / ".astrbot").exists():
        return False
    return True


def get_astrbot_root() -> Path:
    """获取Astrbot根目录路径"""
    return Path.cwd()


async def check_dashboard(astrbot_root: Path) -> None:
    """检查是否安装了dashboard"""
    from astrbot.core.config.default import VERSION
    from astrbot.core.utils.io import (
        download_dashboard,
        download_nebula_dashboard_nightly,
        get_dashboard_channel,
        get_dashboard_version,
    )

    from .version_comparator import VersionComparator

    try:
        dashboard_version = await get_dashboard_version()
        channel = get_dashboard_channel()
        match dashboard_version:
            case None:
                click.echo("未安装管理面板")
                if click.confirm(
                    "是否安装管理面板？",
                    default=True,
                    abort=True,
                ):
                    click.echo("正在安装管理面板...")
                    if channel == "nebula":
                        await download_nebula_dashboard_nightly(
                            path="data/dashboard.zip",
                            extract_path=str(astrbot_root),
                        )
                    else:
                        await download_dashboard(
                            path="data/dashboard.zip",
                            extract_path=str(astrbot_root),
                            version=f"v{VERSION}",
                            latest=False,
                        )
                    click.echo("管理面板安装完成")

            case str():
                if VersionComparator.compare_version(VERSION, dashboard_version) <= 0:
                    click.echo("管理面板已是最新版本")
                    return
                try:
                    version = dashboard_version.split("v")[1]
                    click.echo(f"管理面板版本: {version}")
                    if channel == "nebula":
                        await download_nebula_dashboard_nightly(
                            path="data/dashboard.zip",
                            extract_path=str(astrbot_root),
                        )
                    else:
                        await download_dashboard(
                            path="data/dashboard.zip",
                            extract_path=str(astrbot_root),
                            version=f"v{VERSION}",
                            latest=False,
                        )
                except Exception as e:
                    click.echo(f"下载管理面板失败: {e}")
                    return
    except FileNotFoundError:
        click.echo("初始化管理面板目录...")
        channel = get_dashboard_channel()
        try:
            if channel == "nebula":
                await download_nebula_dashboard_nightly(
                    path=str(astrbot_root / "dashboard.zip"),
                    extract_path=str(astrbot_root),
                )
            else:
                await download_dashboard(
                    path=str(astrbot_root / "dashboard.zip"),
                    extract_path=str(astrbot_root),
                    version=f"v{VERSION}",
                    latest=False,
                )
            click.echo("管理面板初始化完成")
        except Exception as e:
            click.echo(f"下载管理面板失败: {e}")
            return
