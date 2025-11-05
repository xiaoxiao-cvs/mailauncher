import { SunIcon, MoonIcon, MonitorIcon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import type { Theme } from '@/types/theme'

interface ThemeOption {
  value: Theme
  label: string
  description: string
  icon: React.ReactNode
  gradient: string
  iconColor: string
}

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: '亮色模式',
    description: '明亮清新的界面风格',
    icon: <SunIcon className="w-6 h-6" />,
    gradient: 'from-[#90e0ef] to-[#ade8f4]',
    iconColor: '#0077b6'
  },
  {
    value: 'dark',
    label: '暗色模式',
    description: '护眼舒适的深色主题',
    icon: <MoonIcon className="w-6 h-6" />,
    gradient: 'from-[#2e2e2e] to-[#3a3a3a]',
    iconColor: '#8c8c8c'
  },
  {
    value: 'system',
    label: '跟随系统',
    description: '自动适应系统设置',
    icon: <MonitorIcon className="w-6 h-6" />,
    gradient: 'from-[#0096c7] to-[#0077b6]',
    iconColor: '#ade8f4'
  }
]

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-3">
      {themeOptions.map((option) => {
        const isSelected = theme === option.value
        
        return (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`
              w-full p-3.5 rounded-xl transition-all duration-300
              flex items-center gap-3
              ${isSelected 
                ? 'bg-white dark:bg-[#2e2e2e] shadow-lg border-2 border-[#0077b6] dark:border-[#595959]' 
                : 'bg-white/60 dark:bg-[#161616] border-2 border-transparent hover:bg-white/80 dark:hover:bg-[#252525] hover:shadow-md'
              }
            `}
          >
            {/* 图标区域 */}
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br shadow-sm flex-shrink-0"
              style={{ 
                backgroundImage: `linear-gradient(135deg, ${option.gradient.split(' ')[0].replace('from-', '')}, ${option.gradient.split(' ')[1].replace('to-', '')})`,
                color: option.iconColor 
              }}
            >
              <div className="w-5 h-5">
                {option.icon}
              </div>
            </div>

            {/* 文字区域 */}
            <div className="flex-1 text-left min-w-0">
              <div className="font-semibold text-[#03045e] dark:text-white flex items-center gap-2 leading-relaxed">
                {option.label}
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0077b6] dark:bg-[#8c8c8c] animate-pulse flex-shrink-0"></div>
                )}
              </div>
              <div className="text-sm text-[#023e8a]/70 dark:text-white/70 leading-relaxed">
                {option.description}
              </div>
            </div>

            {/* 选中指示器 */}
            <div className={`
              w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
              transition-all duration-300
              ${isSelected 
                ? 'border-[#0077b6] dark:border-[#8c8c8c] bg-[#0077b6] dark:bg-[#8c8c8c]' 
                : 'border-[#023e8a]/30 dark:border-white/30'
              }
            `}>
              {isSelected && (
                <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
