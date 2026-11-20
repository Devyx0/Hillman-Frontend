import { useEffect, useState } from 'react'
import { onCreate, type CreateKind, type CreatePrefill } from '../../lib/create'

/** Mounted once in the layout; renders the create flow requested through `openCreate()`. */
export default function CreateHost() {
  const [, setState] = useState<{ kind: CreateKind; prefill: CreatePrefill } | null>(null)
  useEffect(() => {
    onCreate((kind, prefill) => setState({ kind, prefill }))
    return () => onCreate(null)
  }, [])
  return null
}
