// 3rd party modules
import { useRef, useEffect } from "react"

// HDx modules
// - N/A

const usePreviousValue = <T>(value: T): T => {
  const ref = useRef<T>()
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}
export default usePreviousValue
