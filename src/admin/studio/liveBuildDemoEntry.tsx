import { createRoot } from 'react-dom/client'
import '@fontsource-variable/nunito'
import '../../index.css'
import { LiveBuildDemo } from './liveBuildDemo'
createRoot(document.getElementById('root')!).render(<LiveBuildDemo />)
