import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { SiteFooter } from './components/layout/SiteFooter'
import { SiteHeader } from './components/layout/SiteHeader'
import { ScrollToTop } from './components/layout/ScrollToTop'

const HomePage = lazy(() => import('./pages/HomePage'))
const SignInPage = lazy(() => import('./pages/SignInPage'))
const SignUpPage = lazy(() => import('./pages/SignUpPage'))
const MyWorkPage = lazy(() => import('./pages/MyWorkPage'))
const WaterRocketLayout = lazy(() => import('./pages/water-rocket/WaterRocketLayout'))
const LearnPage = lazy(() => import('./pages/water-rocket/LearnPage'))
const DesignCyclePage = lazy(() => import('./pages/water-rocket/DesignCyclePage'))
const MathPage = lazy(() => import('./pages/water-rocket/MathPage'))
const BuildPage = lazy(() => import('./pages/water-rocket/BuildPage'))
const LaunchPage = lazy(() => import('./pages/water-rocket/LaunchPage'))
const WorksheetsPage = lazy(() => import('./pages/water-rocket/WorksheetsPage'))
const WorksheetPage = lazy(() => import('./pages/water-rocket/WorksheetPage'))
const HangarPage = lazy(() => import('./pages/water-rocket/HangarPage'))

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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      <SiteFooter />
    </div>
  )
}
