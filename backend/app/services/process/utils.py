import os
import sys
import platform
from pathlib import Path
from typing import Optional, List
from app.core.logger import logger


def get_napcat_logged_accounts(instance_path: Path) -> List[dict]:
  """
  获取 NapCat 已登录的 QQ 账号列表（包含昵称）
  
  Args:
      instance_path: 实例路径
      
  Returns:
      已登录的 QQ 账号列表，格式: [{"account": "123456", "nickname": "昵称"}, ...]
  """
  import re
  import json
  from pathlib import Path as PathlibPath
  
  accounts = []
  account_info = {}  # {account: nickname}
  
  # macOS: NapCat 使用系统 QQ，数据存储在用户容器中
  if platform.system() == "Darwin":
    qq_container = PathlibPath.home() / "Library/Containers/com.tencent.qq/Data/Library/Application Support/QQ/NapCat/config"
    if qq_container.exists():
      # 扫描 napcat_{QQ号}.json 文件
      for config_file in qq_container.glob("napcat_*.json"):
        match = re.search(r'napcat_(\d+)\.json', config_file.name)
        if match:
          account = match.group(1)
          if account not in accounts:
            accounts.append(account)
            account_info[account] = "QQ用户"
      
      # 也从 onebot11 配置文件中提取
      for config_file in qq_container.glob("onebot11_*.json"):
        match = re.search(r'onebot11_(\d+)\.json', config_file.name)
        if match:
          account = match.group(1)
          if account not in accounts:
            accounts.append(account)
            account_info[account] = "QQ用户"
  else:
    # Linux/Windows: 检查实例目录中的 NapCat 配置
    napcat_dir = instance_path / "NapCat"
    
    # 检查 config 目录中的配置文件
    config_dir = napcat_dir / "config"
    if config_dir.exists():
      # 扫描带账号的配置文件
      for config_file in config_dir.glob("napcat_*.json"):
        match = re.search(r'napcat_(\d+)\.json', config_file.name)
        if match:
          account = match.group(1)
          if account not in accounts:
            accounts.append(account)
            # 尝试从配置文件读取昵称
            try:
              with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
                nickname = config.get('account', {}).get('nickname') or config.get('nickname') or "QQ用户"
                account_info[account] = nickname
            except Exception as e:
              logger.debug(f"读取配置文件 {config_file} 失败: {e}")
              account_info[account] = "QQ用户"
      
      for config_file in config_dir.glob("onebot11_*.json"):
        match = re.search(r'onebot11_(\d+)\.json', config_file.name)
        if match:
          account = match.group(1)
          if account not in accounts:
            accounts.append(account)
            account_info[account] = "QQ用户"
  
  # 构建结果列表
  result = [
    {"account": account, "nickname": account_info.get(account, "QQ用户")}
    for account in sorted(set(accounts))
  ]
  
  logger.info(f"从 NapCat 获取到 {len(result)} 个已登录账号: {result}")
  return result


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

  if not (start_sh.exists() or start_ps1.exists() or start_bat.exists()):
    raise FileNotFoundError(f"NapCat 启动脚本不存在: {start_sh} 或 {start_ps1} 或 {start_bat}")

  is_windows = platform.system() == "Windows"
  
  logger.info(f"构建 NapCat 启动命令，QQ账号参数: {qq_account}")

  def with_arg(cmd: str) -> str:
    # 如果指定了QQ账号，则使用快速登录
    # 注意：start.sh 脚本接收 QQ 账号作为位置参数，不是 -q 选项
    if qq_account:
      logger.info(f"使用 QQ 账号快速启动: {qq_account}")
      return f"{cmd} {qq_account}"
    else:
      logger.info("未指定QQ账号，将使用二维码登录")
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
