import { BRIDGE_CYCLE_STEPS } from '../../content/bridge-builder/cycle'
import { BRIDGE_WORKSHEETS } from '../../content/bridge-builder/worksheets'
import { WORKSHOP_BRIDGE } from '../../store/bridgeStore'
import { WorksheetRoute } from '../shared/WorksheetView'

export default function BridgeWorksheetPage() {
  return (
    <WorksheetRoute
      workshop={WORKSHOP_BRIDGE}
      workshopTitle="Bridge Builder"
      worksheets={BRIDGE_WORKSHEETS}
      cycleSteps={BRIDGE_CYCLE_STEPS}
      next={{ label: '🏋️ To the test rig', to: '../../test' }}
    />
  )
}
