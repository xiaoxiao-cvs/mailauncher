name: 💡 功能改进建议
description: 对现有功能提出改进建议
title: "[改进] "
labels: ["enhancement"]
body:
  - type: markdown
    attributes:
      value: |
        感谢你提出功能改进建议！这将帮助我们让产品变得更好。

  - type: textarea
    id: improvement-description
    attributes:
      label: 改进建议
      description: 请清晰地描述你想改进的功能
      placeholder: 我希望改进...
    validations:
      required: true

  - type: textarea
    id: current-functionality
    attributes:
      label: 当前功能描述
      description: 描述当前功能是如何工作的
      placeholder: 目前这个功能...
    validations:
      required: true

  - type: textarea
    id: expected-improvement
    attributes:
      label: 期望的改进
      description: 详细描述你希望如何改进这个功能
      placeholder: 我希望它可以...
    validations:
      required: true

  - type: textarea
    id: improvement-reason
    attributes:
      label: 改进理由
      description: 说明为什么需要这个改进，它能解决什么问题或带来什么好处
      placeholder: 这个改进能够...
    validations:
      required: true

  - type: textarea
    id: design-suggestion
    attributes:
      label: 设计建议
      description: 如果有具体的UI/UX改进建议，可以在这里描述或附上设计稿
      placeholder: 界面可以这样设计...

  - type: checkboxes
    id: target-platforms
    attributes:
      label: 适用系统
      description: 这个改进是针对特定系统还是全平台
      options:
        - label: macOS
        - label: Windows
        - label: Linux
        - label: 全平台

  - type: dropdown
    id: priority
    attributes:
      label: 优先级
      description: 你认为这个改进的优先级如何
      options:
        - 低 - 可以有，但不紧急
        - 中 - 会明显改善用户体验
        - 高 - 严重影响使用体验
    validations:
      required: true

  - type: textarea
    id: additional-context
    attributes:
      label: 附加信息
      description: 添加任何其他相关信息、参考链接、竞品对比等
      placeholder: 其他补充信息...
