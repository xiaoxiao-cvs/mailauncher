name: ✨ 新增功能
description: 提出新功能需求
title: "[功能] "
labels: ["feature"]
body:
  - type: markdown
    attributes:
      value: |
        感谢你提出新功能需求！请详细描述你的想法。

  - type: textarea
    id: feature-description
    attributes:
      label: 功能描述
      description: 请清晰、简洁地描述你想要的新功能
      placeholder: 我希望能够...
    validations:
      required: true

  - type: textarea
    id: use-case
    attributes:
      label: 使用场景
      description: 描述在什么场景下需要这个功能
      placeholder: 当我想要...的时候，这个功能能够...
    validations:
      required: true

  - type: textarea
    id: expected-implementation
    attributes:
      label: 期望实现
      description: 详细描述这个功能应该如何工作
      placeholder: 这个功能应该...
    validations:
      required: true

  - type: textarea
    id: solution-suggestion
    attributes:
      label: 解决方案建议
      description: 如果你有实现这个功能的想法，请在这里描述
      placeholder: 我认为可以通过...来实现

  - type: textarea
    id: alternatives
    attributes:
      label: 替代方案
      description: 是否考虑过其他替代方案？如果有，请描述
      placeholder: 或者也可以...

  - type: checkboxes
    id: target-platforms
    attributes:
      label: 目标平台
      description: 这个功能应该在哪些平台上实现
      options:
        - label: macOS
        - label: Windows
        - label: Linux
        - label: 全平台

  - type: textarea
    id: ui-design
    attributes:
      label: 界面设计建议
      description: 如果涉及UI变更，请描述或附上设计稿
      placeholder: 界面可以这样设计...

  - type: textarea
    id: feature-value
    attributes:
      label: 功能价值
      description: 这个功能能带来什么价值？预期有多少用户会使用？
      placeholder: 这个功能的价值在于...
    validations:
      required: true

  - type: dropdown
    id: priority
    attributes:
      label: 优先级
      description: 你认为这个功能的优先级如何
      options:
        - 低 - Nice to have
        - 中 - 会提升产品竞争力
        - 高 - 核心功能缺失
    validations:
      required: true

  - type: textarea
    id: related-issues
    attributes:
      label: 相关Issue
      description: 如果有相关的issue，请在这里引用
      placeholder: "#123, #456"

  - type: textarea
    id: additional-context
    attributes:
      label: 附加信息
      description: 添加任何其他相关信息、参考案例、竞品功能等
      placeholder: 其他补充信息...
