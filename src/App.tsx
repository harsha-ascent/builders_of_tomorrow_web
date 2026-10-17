import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { SiteFooter } from './components/layout/SiteFooter'
import { SiteHeader } from './components/layout/SiteHeader'
import { ScrollToTop } from './components/layout/ScrollToTop'

const HomePage = lazy(() => import('./pages/HomePage'))
const SignInPage = lazy(() => import('./pages/SignInPage'))
const SignUpPage = lazy(() => import('./pages/SignUpPage'))
const MyWorkPage = lazy(() => import('./pages/MyWorkPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const WaterRocketLayout = lazy(() => import('./pages/water-rocket/WaterRocketLayout'))
const LearnPage = lazy(() => import('./pages/water-rocket/LearnPage'))
const DesignCyclePage = lazy(() => import('./pages/water-rocket/DesignCyclePage'))
const MathPage = lazy(() => import('./pages/water-rocket/MathPage'))
const BuildPage = lazy(() => import('./pages/water-rocket/BuildPage'))
const LaunchPage = lazy(() => import('./pages/water-rocket/LaunchPage'))
const WorksheetsPage = lazy(() => import('./pages/water-rocket/WorksheetsPage'))
const WorksheetPage = lazy(() => import('./pages/water-rocket/WorksheetPage'))
const HangarPage = lazy(() => import('./pages/water-rocket/HangarPage'))
const BridgeLayout = lazy(() => import('./pages/bridge-builder/BridgeLayout'))
const BridgeLearnPage = lazy(() => import('./pages/bridge-builder/BridgeLearnPage'))
const BridgeDesignCyclePage = lazy(() => import('./pages/bridge-builder/BridgeDesignCyclePage'))
const BridgeBuildPage = lazy(() => import('./pages/bridge-builder/BridgeBuildPage'))
const BridgeTestPage = lazy(() => import('./pages/bridge-builder/BridgeTestPage'))
const BridgeWorksheetsPage = lazy(() => import('./pages/bridge-builder/BridgeWorksheetsPage'))
const BridgeWorksheetPage = lazy(() => import('./pages/bridge-builder/BridgeWorksheetPage'))
const BridgeHangarPage = lazy(() => import('./pages/bridge-builder/BridgeHangarPage'))
const BridgeMathPage = lazy(() => import('./pages/bridge-builder/BridgeMathPage'))

function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="animate-wiggle text-5xl">🚀</div>
    </div>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <SiteHeader />
      <div className="flex-1">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
            <Route path="/me" element={<MyWorkPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/workshops/water-rocket" element={<WaterRocketLayout />}>
              <Route index element={<Navigate to="learn" replace />} />
              <Route path="learn" element={<LearnPage />} />
              <Route path="design-cycle" element={<DesignCyclePage />} />
              <Route path="math" element={<MathPage />} />
              <Route path="build" element={<BuildPage />} />
              <Route path="launch" element={<LaunchPage />} />
              <Route path="worksheets" element={<WorksheetsPage />} />
              <Route path="worksheets/:worksheetId" element={<WorksheetPage />} />
              <Route path="hangar" element={<HangarPage />} />
            </Route>
            <Route path="/workshops/bridge-builder" element={<BridgeLayout />}>
              <Route index element={<Navigate to="learn" replace />} />
              <Route path="learn" element={<BridgeLearnPage />} />
              <Route path="design-cycle" element={<BridgeDesignCyclePage />} />
              <Route path="build" element={<BridgeBuildPage />} />
              <Route path="test" element={<BridgeTestPage />} />
              <Route path="worksheets" element={<BridgeWorksheetsPage />} />
              <Route path="worksheets/:worksheetId" element={<BridgeWorksheetPage />} />
              <Route path="hangar" element={<BridgeHangarPage />} />
              <Route path="math" element={<BridgeMathPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      <SiteFooter />
    </div>
  )
}
