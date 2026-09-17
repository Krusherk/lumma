import { lazy, Suspense, type ReactElement } from 'react'
import { Routes, Route } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import ErrorBoundary from './components/ErrorBoundary'

const WalletApp = lazy(() => import('./components/WalletApp'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const TestnetPage = lazy(() => import('./pages/TestnetPage'))
const DocsPage = lazy(() => import('./pages/DocsPage'))
const BlogPage = lazy(() => import('./pages/BlogPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const JoinPage = lazy(() => import('./pages/JoinPage'))
const AgentsPage = lazy(() => import('./pages/AgentsPage'))
const PayrollReceiptPage = lazy(() => import('./pages/PayrollReceiptPage'))

const hostname = window.location.hostname
const isApp = hostname.startsWith('app.') || hostname.startsWith('testnet.')
const isDocs = hostname.startsWith('docs.')
const isBlog = hostname.startsWith('blog.')
const isAdmin = hostname.startsWith('ad.')
const isPayroll = hostname.startsWith('payroll.')

function Boot() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: 18,
        height: 18,
        border: '2px solid rgba(147,51,234,.25)',
        borderTopColor: '#9333ea',
        borderRadius: '50%',
        animation: 'spin .6s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function withWallet(page: ReactElement) {
  return (
    <Suspense fallback={<Boot />}>
      <WalletApp>
        <ErrorBoundary>{page}</ErrorBoundary>
      </WalletApp>
    </Suspense>
  )
}

export default function App() {
  if (isApp) {
    return (
      <>
        {withWallet(<TestnetPage />)}
        <SpeedInsights />
      </>
    )
  }

  if (isDocs) {
    return <Suspense fallback={<Boot />}><DocsPage /><SpeedInsights /></Suspense>
  }

  if (isBlog) {
    return <Suspense fallback={<Boot />}><BlogPage /><SpeedInsights /></Suspense>
  }

  if (isAdmin) {
    return <Suspense fallback={<Boot />}><AdminPage /><SpeedInsights /></Suspense>
  }

  if (isPayroll) {
    return <Suspense fallback={<Boot />}><PayrollReceiptPage /><SpeedInsights /></Suspense>
  }

  return (
    <Suspense fallback={<Boot />}>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/bridge" element={withWallet(<TestnetPage />)} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/join/:token" element={withWallet(<JoinPage />)} />
          <Route path="/agents" element={<AgentsPage />} />
        </Routes>
      </ErrorBoundary>
      <SpeedInsights />
    </Suspense>
  )
}
