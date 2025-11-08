name: 🐛 Bug反馈
description: 报告项目中的bug或问题
title: "[BUG] "
labels: ["bug"]
body:
  - type: markdown
    attributes:
      value: |
        感谢你花时间填写这个bug报告！请尽可能详细地描述问题。

  - type: checkboxes
    id: checklist
    attributes:
      label: 检查项
      description: 请确保下列项目，并勾选确认。
      options:
        - label: 我确认此问题在有分支的最新版本中依旧存在
          required: true
        - label: 我确认在 Issues 列表中并无其他人已经提出与此问题相同或相似的问题
          required: true
        - label: 我使用了 Docker
          required: false

  - type: dropdown
    id: branch
    attributes:
      label: 使用的分支
      description: 请选择你正在使用的版本分支
      options:
        - main
        - dev
        - 其他
    validations:
      required: true

  - type: input
    id: version
    attributes:
      label: 具体版本号
      description: 请输入你使用的具体版本号
      placeholder: 例如：0.5.11、0.5.8、0.6.0
    validations:
      required: true

  - type: dropdown
    id: os
    attributes:
      label: 操作系统
      description: 你在使用什么操作系统？
      options:
        - macOS
        - Windows
        - Linux
        - 其他
    validations:
      required: true

  - type: input
    id: os-version
    attributes:
      label: 操作系统版本
      description: 请输入具体的操作系统版本
      placeholder: 例如：macOS 14.0、Windows 11、Ubuntu 22.04
    validations:
      required: true

  - type: dropdown
    id: architecture
    attributes:
      label: 系统架构
      description: 你的系统架构是什么？
      options:
        - x64 (Intel)
        - arm64 (Apple Silicon/M1/M2)
        - 其他
    validations:
      required: true

  - type: textarea
    id: bug-description
    attributes:
      label: Bug描述
      description: 请清晰、简洁地描述这个bug
      placeholder: 详细描述遇到的问题...
    validations:
      required: true

  - type: textarea
    id: reproduce-steps
    attributes:
      label: 复现步骤
      description: 如何复现这个问题？
      placeholder: |
        1. 打开应用...
        2. 点击...
        3. 看到错误...
    validations:
      required: true

  - type: textarea
    id: expected-behavior
    attributes:
      label: 预期行为
      description: 你期望发生什么？
      placeholder: 描述预期的正常行为...
    validations:
      required: true

  - type: textarea
    id: actual-behavior
    attributes:
      label: 实际行为
      description: 实际发生了什么？
      placeholder: 描述实际发生的情况，可以附上截图...
    validations:
      required: true

  - type: textarea
    id: logs
    attributes:
      label: 日志信息
      description: 如果有相关的错误日志，请粘贴在这里
      render: shell
      placeholder: 粘贴相关日志...

  - type: textarea
    id: additional
    attributes:
      label: 附加信息
      description: 添加任何其他有助于解决问题的信息
      placeholder: 其他补充信息...
