import os
import sys
import platform
from pathlib import Path
from typing import Optional, List
from app.core.logger import logger


def get_napcat_logged_accounts(instance_path: Path) -> List[str]:
  """
  获取 NapCat 已登录的 QQ 账号列表
  
  Args:
      instance_path: 实例路径
      
  Returns:
      已登录的 QQ 账号列表
  """
  accounts = []
  napcat_dir = instance_path / "NapCat"
  
  # 检查登录标记文件是否存在
  login_flag = napcat_dir / ".logged_in"
  if not login_flag.exists():
    logger.debug(f"NapCat 登录标记文件不存在: {login_flag}")
    return accounts
  
  # 检查 QQ 数据目录（macOS/Linux）
  qq_data_dir = napcat_dir / "QQ"
  if qq_data_dir.exists():
    # 扫描 QQ 数据目录下的账号文件夹
    for item in qq_data_dir.iterdir():
      if item.is_dir() and item.name.isdigit():
        accounts.append(item.name)
  
  # 检查 config 目录中的配置文件
  config_dir = napcat_dir / "config"
  if config_dir.exists():
    onebot_config = config_dir / "onebot11.json"
    if onebot_config.exists():
      try:
        import json
        with open(onebot_config, 'r', encoding='utf-8') as f:
          config = json.load(f)
          # 尝试从配置中读取账号信息
          if isinstance(config, dict) and 'account' in config:
            account = str(config['account'])
            if account and account not in accounts:
              accounts.append(account)
      except Exception as e:
        logger.warning(f"读取 NapCat 配置文件失败: {e}")
  
  # 去重并排序
  accounts = sorted(list(set(accounts)))
  logger.info(f"从 NapCat 获取到 {len(accounts)} 个已登录账号: {accounts}")
  return accounts


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
