import { useEffect, useState } from 'react'
import { timeLeft } from '../lib/format'

export function Countdown({ closeTime, className = '' }: { closeTime: number; className?: string }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])
  return <span className={className}>{timeLeft(closeTime)}</span>
}
