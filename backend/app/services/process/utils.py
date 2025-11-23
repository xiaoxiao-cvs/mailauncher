import os
import sys
import platform
from pathlib import Path
from typing import Optional
from app.core.logger import logger


def resolve_python(instance_path: Path, python_path: str | None) -> str:
  if python_path:
    return python_path
  venv_python = instance_path / ".venv" / "bin" / "python"
  if not venv_python.exists():
    venv_python = instance_path / ".venv" / "Scripts" / "python.exe"
  if venv_python.exists():
    logger.info(f"使用虚拟环境 Python: {venv_python}")
    return str(venv_python)
  logger.warning(f"未找到虚拟环境 Python，使用系统 Python: {sys.executable}")
  return sys.executable


def build_napcat_command(instance_path: Path, qq_account: Optional[str]) -> tuple[str, str]:
  cwd = str(instance_path / "NapCat")
  start_sh = Path(cwd) / "start.sh"
  start_ps1 = Path(cwd) / "start.ps1"
  start_bat = Path(cwd) / "start.bat"
  login_flag = Path(cwd) / ".logged_in"

  if not (start_sh.exists() or start_ps1.exists() or start_bat.exists()):
    raise FileNotFoundError(f"NapCat 启动脚本不存在: {start_sh} 或 {start_ps1} 或 {start_bat}")

  is_windows = platform.system() == "Windows"

  def with_arg(cmd: str) -> str:
    if login_flag.exists() and qq_account:
      logger.info(f"使用 QQ 账号快速启动: {qq_account}")
      return f"{cmd} \"{qq_account}\""
    return cmd

  if is_windows:
    if start_ps1.exists():
      cmd = "powershell -NoProfile -ExecutionPolicy Bypass -File \"start.ps1\""
      return with_arg(cmd), cwd
    if start_bat.exists():
      cmd = "cmd.exe /c \"start.bat\""
      return with_arg(cmd), cwd
    cmd = "bash \"start.sh\""
    return with_arg(cmd), cwd
  else:
    cmd = "bash \"start.sh\""
    return with_arg(cmd), cwd
