import { WORKSHEETS } from '../../content/water-rocket/worksheets'
import { WORKSHOP_WATER_ROCKET } from '../../sim/presets'
import { WorksheetsView } from '../shared/WorksheetsView'

export default function WorksheetsPage() {
  return <WorksheetsView workshop={WORKSHOP_WATER_ROCKET} worksheets={WORKSHEETS} />
}
