/**
 * 关键词规则编辑器
 * 专门用于编辑 keyword_reaction.keyword_rules 的组件
 * 提供更友好的界面来管理关键词触发规则
 */
import React, { useState } from 'react'
import { Plus, XIcon, Trash2, Edit2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface KeywordRule {
  keywords: string[]
  reaction: string
}

interface KeywordRulesEditorProps {
  rules: KeywordRule[]
  onChange: (rules: KeywordRule[]) => void
  readOnly?: boolean
}

export const KeywordRulesEditor: React.FC<KeywordRulesEditorProps> = ({
  rules = [],
  onChange,
  readOnly = false,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const [tempRule, setTempRule] = useState<KeywordRule>({
    keywords: [],
    reaction: '',
  })
  const [keywordInput, setKeywordInput] = useState('')

  // 开始编辑规则
  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setTempRule({ ...rules[index] })
    setKeywordInput('')
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingIndex(null)
    setTempRule({ keywords: [], reaction: '' })
    setKeywordInput('')
  }

  // 保存编辑
  const handleSaveEdit = () => {
    if (editingIndex === null) return
    
    if (tempRule.keywords.length === 0) {
      toast.error('请至少添加一个关键词')
      return
    }
    
    if (!tempRule.reaction.trim()) {
      toast.error('请填写触发反应内容')
      return
    }

    const newRules = [...rules]
    newRules[editingIndex] = tempRule
    onChange(newRules)
    handleCancelEdit()
    toast.success('规则已更新')
  }

  // 添加新规则
  const handleAddNew = () => {
    const newRule: KeywordRule = {
      keywords: [],
      reaction: '',
    }
    onChange([...rules, newRule])
    setEditingIndex(rules.length)
    setTempRule(newRule)
    setKeywordInput('')
  }

  // 删除规则
  const handleDelete = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index)
    onChange(newRules)
    setDeleteIndex(null)
    toast.success('规则已删除')
  }

  // 添加关键词
  const handleAddKeyword = () => {
    const keyword = keywordInput.trim()
    if (!keyword) return
    
    if (tempRule.keywords.includes(keyword)) {
      toast.error('关键词已存在')
      return
    }
    
    setTempRule({
      ...tempRule,
      keywords: [...tempRule.keywords, keyword],
    })
    setKeywordInput('')
  }

  // 删除关键词
  const handleRemoveKeyword = (keyword: string) => {
    setTempRule({
      ...tempRule,
      keywords: tempRule.keywords.filter((k) => k !== keyword),
    })
  }

  // 处理键盘事件
  const handleKeywordInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddKeyword()
    }
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">关键词触发规则</h3>
          <p className="text-sm text-muted-foreground">
            当消息中包含指定关键词时，触发特定的回复行为
          </p>
        </div>
        {!readOnly && (
          <Button onClick={handleAddNew} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            添加规则
          </Button>
        )}
      </div>

      {/* 规则列表 */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-3 pr-4">
          {rules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>暂无规则</p>
              {!readOnly && (
                <p className="text-sm mt-2">点击上方"添加规则"按钮创建第一条规则</p>
              )}
            </div>
          ) : (
            rules.map((rule, index) => (
              <Card key={index} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm font-medium">
                        规则 {index + 1}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {rule.keywords.length} 个关键词
                      </CardDescription>
                    </div>
                    {!readOnly && editingIndex !== index && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(index)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteIndex(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                {editingIndex === index ? (
                  // 编辑模式
                  <CardContent className="space-y-4">
                    {/* 关键词编辑 */}
                    <div className="space-y-2">
                      <Label>关键词</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="输入关键词后按回车添加"
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyDown={handleKeywordInputKeyDown}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddKeyword}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tempRule.keywords.map((keyword) => (
                          <Button
                            key={keyword}
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRemoveKeyword(keyword)}
                          >
                            {keyword}
                            <XIcon className="ml-1 h-3 w-3 opacity-60" />
                          </Button>
                        ))}
                        {tempRule.keywords.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            请添加至少一个关键词
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 触发反应编辑 */}
                    <div className="space-y-2">
                      <Label>触发反应</Label>
                      <Textarea
                        placeholder="描述当关键词被触发时，机器人应该如何回应..."
                        value={tempRule.reaction}
                        onChange={(e) =>
                          setTempRule({ ...tempRule, reaction: e.target.value })
                        }
                        rows={4}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        这段文字会作为额外的提示词注入到对话中，引导机器人的回复行为
                      </p>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2 justify-end pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                      >
                        <X className="mr-1 h-4 w-4" />
                        取消
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit}>
                        <Save className="mr-1 h-4 w-4" />
                        保存
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  // 显示模式
                  <CardContent className="space-y-3">
                    {/* 关键词显示 */}
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        关键词：
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rule.keywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 触发反应显示 */}
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        触发反应：
                      </span>
                      <p className="text-sm mt-1 text-foreground/80 whitespace-pre-wrap">
                        {rule.reaction}
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={deleteIndex !== null}
        onOpenChange={() => setDeleteIndex(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除规则 {deleteIndex !== null ? deleteIndex + 1 : ''} 吗？
              此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteIndex !== null && handleDelete(deleteIndex)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
