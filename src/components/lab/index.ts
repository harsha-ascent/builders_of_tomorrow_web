/**
 * Reusable pieces for a workshop "lab view": a dark instrument panel with linked panels over one shared
 * state. Workshop-specific code (the rocket, the bridge) lives in its own pages; nothing here knows about
 * either.
 */
export { LabShell, LabPanel, LabSeg, Readout, Dot } from './LabShell'
export { LabSlider } from './LabSlider'
export { ParameterMap, type MapAxis, type MapPreset, type MapGuide, type MapContour, type ParameterMapProps } from './ParameterMap'
export { TimeSeriesGraph, type GraphSeries, type GraphBand, type GraphMarker, type TimeSeriesGraphProps } from './TimeSeriesGraph'
export { useHashState, clearHash } from './useHashState'
export { LabViewSwitch } from './LabViewSwitch'
export { useLabView, hashView, type LabView } from './useLabView'
export { useCanvas, useLatest, localPoint, capturePointer, releasePointer, labTheme, rampColor, valueAt, LAB_ACCENT, clampNum, snap } from './canvasUtils'
export { LabEquation } from './LabEquation'
export { fmtNum } from './format'
