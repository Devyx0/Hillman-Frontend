/** Tiny global toast bus (mockup: `oe(message)`). The <Toaster/> in the layout subscribes. */
let listener: ((message: string) => void) | null = null

export function onToast(fn: (message: string) => void) {
  listener = fn
}

export function toast(message: string) {
  listener?.(message)
}
