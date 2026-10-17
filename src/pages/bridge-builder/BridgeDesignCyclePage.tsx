import { BRIDGE_CYCLE_STEPS } from '../../content/bridge-builder/cycle'
import { DesignCycleView } from '../shared/DesignCycleView'

export default function BridgeDesignCyclePage() {
  return (
    <DesignCycleView
      steps={BRIDGE_CYCLE_STEPS}
      intro={
        <>
          The first bridge always breaks somewhere surprising. Engineers follow the <strong>Engineering Design Cycle</strong>: find the weakest
          link, fix only that, test again. Tap a step to explore it.
        </>
      }
      journal={{ label: '📓 Start my Bridge Journal', to: '../worksheets/bridge-journal' }}
      build={{ label: '🔧 Go to the workbench', to: '../build' }}
    />
  )
}
