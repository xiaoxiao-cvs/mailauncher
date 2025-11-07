import { useId } from "react"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export default function Component() {
  const id = useId()
  return (
    <RadioGroup className="gap-2" defaultValue="1">
      {/* Radio card #1 */}
      <div className="relative flex w-full items-start gap-2 rounded-md border border-input p-4 shadow-xs outline-none has-data-[state=checked]:border-primary/50">
        <RadioGroupItem
          value="1"
          id={`${id}-1`}
          aria-describedby={`${id}-1-description`}
          className="order-1 after:absolute after:inset-0"
        />
        <div className="grid grow gap-2">
          <Label htmlFor={`${id}-1`}>
            Label{" "}
            <span className="text-xs leading-[inherit] font-normal text-muted-foreground">
              (Sublabel)
            </span>
          </Label>
          <p
            id={`${id}-1-description`}
            className="text-xs text-muted-foreground"
          >
            You can use this card with a label and a description.
          </p>
        </div>
      </div>
      {/* Radio card #2 */}
      <div className="relative flex w-full items-start gap-2 rounded-md border border-input p-4 shadow-xs outline-none has-data-[state=checked]:border-primary/50">
        <RadioGroupItem
          value="2"
          id={`${id}-2`}
          aria-describedby={`${id}-2-description`}
          className="order-1 after:absolute after:inset-0"
        />
        <div className="grid grow gap-2">
          <Label htmlFor={`${id}-2`}>
            Label{" "}
            <span className="text-xs leading-[inherit] font-normal text-muted-foreground">
              (Sublabel)
            </span>
          </Label>
          <p
            id={`${id}-2-description`}
            className="text-xs text-muted-foreground"
          >
            You can use this card with a label and a description.
          </p>
        </div>
      </div>
    </RadioGroup>
  )
}
