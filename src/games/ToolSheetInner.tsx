import { useState } from 'react'
import type { ManipulativeConfig, ManipulativeTool } from '../data/types'
import { tools } from '../manipulatives/registry'

export default function ToolSheetInner({ tool, config }: { tool: ManipulativeTool; config?: ManipulativeConfig }) {
  const def = tools[tool]
  const cfg = { ...def.defaultConfig, ...config }
  const [value, setValue] = useState(() => def.initial(cfg))
  const Comp = def.Component
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-line sm:p-5">
      <Comp value={value} onChange={setValue} config={cfg} />
    </div>
  )
}
