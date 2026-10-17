import { CYCLE_STEPS } from '../../content/water-rocket/cycle'
import { WORKSHEETS } from '../../content/water-rocket/worksheets'
import { WORKSHOP_WATER_ROCKET } from '../../sim/presets'
import { WorksheetRoute } from '../shared/WorksheetView'

export default function WorksheetPage() {
  return (
    <WorksheetRoute
      workshop={WORKSHOP_WATER_ROCKET}
      workshopTitle="Water Rocket Lab"
      worksheets={WORKSHEETS}
      cycleSteps={CYCLE_STEPS}
      next={{ label: '🚀 To the launch pad', to: '../../launch' }}
    />
  )
}
