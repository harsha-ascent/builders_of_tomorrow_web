import { BRIDGE_WORKSHEETS } from '../../content/bridge-builder/worksheets'
import { WORKSHOP_BRIDGE } from '../../store/bridgeStore'
import { WorksheetsView } from '../shared/WorksheetsView'

export default function BridgeWorksheetsPage() {
  return <WorksheetsView workshop={WORKSHOP_BRIDGE} worksheets={BRIDGE_WORKSHEETS} />
}
