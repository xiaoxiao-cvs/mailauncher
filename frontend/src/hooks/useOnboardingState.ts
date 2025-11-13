import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function useOnboardingState() {
  const navigate = useNavigate()
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed')
    if (completed === 'true') {
      setHasCompletedOnboarding(true)
    }
  }, [])

  const complete = () => {
    localStorage.setItem('onboarding_completed', 'true')
    setHasCompletedOnboarding(true)
    navigate('/home')
  }

  const skip = () => {
    localStorage.setItem('onboarding_completed', 'true')
    setHasCompletedOnboarding(true)
    navigate('/home')
  }

  return { hasCompletedOnboarding, complete, skip }
}
