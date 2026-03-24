import { useId } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface CustomSelectOption {
  value: string
  label: string
  desc?: string
}

interface CustomSelectProps {
  label: string
  value: string
  onChange: (val: string) => void
  options: CustomSelectOption[]
  placeholder?: string
  className?: string
}

export function CustomSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  className,
}: CustomSelectProps) {
  const id = useId()
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-10 bg-background/50 border-input/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex flex-col items-start text-left">
                <span className="font-medium">{opt.label}</span>
                {opt.desc && <span className="text-xs text-muted-foreground">{opt.desc}</span>}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
