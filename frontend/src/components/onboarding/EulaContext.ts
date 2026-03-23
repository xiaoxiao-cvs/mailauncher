import { createContext } from 'react'

export interface EulaContextValue {
  onCanProceedChange: (canProceed: boolean) => void
  onButtonLabelChange: (label: string | null) => void
}

export const EulaContext = createContext<EulaContextValue>({
  onCanProceedChange: () => {},
  onButtonLabelChange: () => {},
})
