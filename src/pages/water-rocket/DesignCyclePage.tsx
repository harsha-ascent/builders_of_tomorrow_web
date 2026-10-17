import { CYCLE_STEPS } from '../../content/water-rocket/cycle'
import { DesignCycleView } from '../shared/DesignCycleView'

export default function DesignCyclePage() {
  return (
    <DesignCycleView
      steps={CYCLE_STEPS}
      intro={
        <>
          Nobody builds the perfect rocket on the first try. Engineers follow a loop called the <strong>Engineering Design Cycle</strong>.
          Every time round, the design gets a little better. Tap a step to explore it.
        </>
      }
      journal={{ label: '📓 Start my Design Journal', to: '../worksheets/design-journal' }}
      build={{ label: '🔧 Go to the workbench', to: '../build' }}
    />
  )
}
