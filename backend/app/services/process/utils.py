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
  """解析 Python 路径，返回带引号的路径（用于命令行）"""
  if python_path:
    # 如果路径包含空格，需要加引号
    if ' ' in python_path:
      return f'"{python_path}"'
    return python_path
  venv_python = instance_path / ".venv" / "bin" / "python"
  if not venv_python.exists():
    venv_python = instance_path / ".venv" / "Scripts" / "python.exe"
  if venv_python.exists():
    logger.info(f"使用虚拟环境 Python: {venv_python}")
    path_str = str(venv_python)
    # 如果路径包含空格，需要加引号
    if ' ' in path_str:
      return f'"{path_str}"'
    return path_str
  logger.warning(f"未找到虚拟环境 Python，使用系统 Python: {sys.executable}")
  exe_path = sys.executable
  if ' ' in exe_path:
    return f'"{exe_path}"'
  return exe_path


def build_napcat_command(instance_path: Path, qq_account: Optional[str]) -> tuple[str, str]:
  """构建 NapCat 启动命令
  
  Args:
      instance_path: 实例路径
      qq_account: QQ 账号（用于快速登录），可选
      
  Returns:
      (命令字符串, 工作目录)
  """
  napcat_dir = instance_path / "NapCat"
  cwd = str(napcat_dir)
  start_sh = napcat_dir / "start.sh"   # macOS
  start_bat = napcat_dir / "start.bat"  # Windows

  is_windows = platform.system() == "Windows"
  
  logger.info(f"构建 NapCat 启动命令，QQ账号参数: {qq_account}")

  if is_windows:
    # Windows: 直接使用 NapCat 官方的 launcher-user.bat（用户模式，无需管理员权限）
    launcher_user_bat = napcat_dir / "launcher-user.bat"
    launcher_bat = napcat_dir / "launcher.bat"
    
    # 优先使用 launcher-user.bat
    if launcher_user_bat.exists():
      launcher = "launcher-user.bat"
    elif launcher_bat.exists():
      launcher = "launcher.bat"
    else:
      raise FileNotFoundError(
        f"NapCat 启动脚本不存在: {launcher_user_bat}\n"
        f"请重新安装 NapCat。"
      )
    
    if qq_account:
      logger.info(f"使用 QQ 账号快速启动: {qq_account}")
      cmd = f'cmd /c {launcher} -q {qq_account}'
    else:
      logger.info("未指定QQ账号，将使用二维码登录")
      cmd = f'cmd /c {launcher}'
    return cmd, cwd
  else:
    # macOS: 使用 start.sh
    if not start_sh.exists():
      raise FileNotFoundError(
        f"NapCat 启动脚本不存在: {start_sh}\n"
        f"请重新安装 NapCat。"
      )
    
    if qq_account:
      logger.info(f"使用 QQ 账号快速启动: {qq_account}")
      cmd = f'bash "start.sh" {qq_account}'
    else:
      logger.info("未指定QQ账号，将使用二维码登录")
      cmd = 'bash "start.sh"'
    return cmd, cwd
