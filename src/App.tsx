import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from '@privy-io/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Routes, Route } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { PRIVY_APP_ID, privyConfig } from './config/privy'
import { wagmiConfig } from './config/wagmi'
import LandingPage from './pages/LandingPage'
import TestnetPage from './pages/TestnetPage'
import DocsPage from './pages/DocsPage'
import BlogPage from './pages/BlogPage'
import AdminPage from './pages/AdminPage'
import JoinPage from './pages/JoinPage'
import AgentsPage from './pages/AgentsPage'
import PayrollReceiptPage from './pages/PayrollReceiptPage'

import ErrorBoundary from './components/ErrorBoundary'

const queryClient = new QueryClient()

// Detect subdomain to render the right page
const hostname = window.location.hostname
const isTestnet = hostname.startsWith('testnet.')
const isDocs = hostname.startsWith('docs.')
const isBlog = hostname.startsWith('blog.')
const isAdmin = hostname.startsWith('ad.')
const isPayroll = hostname.startsWith('payroll.')

export default function App() {
  if (isTestnet) {
    return (
      <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <ErrorBoundary>
              <TestnetPage />
            </ErrorBoundary>
            <SpeedInsights />
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    )
  }

  if (isDocs) {
    return <><DocsPage /><SpeedInsights /></>
  }

  if (isBlog) {
    return <><BlogPage /><SpeedInsights /></>
  }

  if (isAdmin) {
    return <><AdminPage /><SpeedInsights /></>
  }

  if (isPayroll) {
    return <><PayrollReceiptPage /><SpeedInsights /></>
  }

  // Main domain — normal routing
  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/bridge" element={<TestnetPage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/join/:token" element={<JoinPage />} />
              <Route path="/agents" element={<AgentsPage />} />
            </Routes>

          </ErrorBoundary>
          <SpeedInsights />
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  )
}
