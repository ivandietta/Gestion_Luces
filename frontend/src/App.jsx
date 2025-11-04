import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import { ToastProvider } from './components/Toast'
import Navbar from './components/Navbar'
import BottomNavigation from './components/BottomNavigation'
import Login from './pages/Login'
import Unauthorized from './pages/Unauthorized'
import ProtectedRoute, { AdminRoute, OperatorRoute, AuthenticatedRoute } from './components/ProtectedRoute'

// Lazy loading de páginas para mejorar tiempo de carga inicial (40-60% más rápido)
const Classrooms = lazy(() => import('./pages/Classrooms'))
const AulaDetail = lazy(() => import('./pages/AulaDetail'))
const History = lazy(() => import('./pages/History'))
const Users = lazy(() => import('./pages/Users'))

// Loading component
const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Cargando...</p>
    </div>
  </div>
)

// Component to handle conditional rendering of navbar and bottom nav
const AppContent = () => {
  const location = useLocation()
  const [isMobile, setIsMobile] = useState(false)
  const { isAuthenticated, loading } = useAuth()

  // Hide navbar and bottom navigation on login and unauthorized pages
  const hideNavigation = location.pathname === '/login' || location.pathname === '/unauthorized'

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Check initially
    checkMobile()

    // Add resize listener
    window.addEventListener('resize', checkMobile)

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Show loading spinner while auth context is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!hideNavigation && !isMobile && <Navbar />}
      <main className={`container mx-auto px-4 pb-20 md:pb-8 ${hideNavigation ? 'pt-0' : 'pt-4'}`}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Root route - redirect based on authentication status */}
            <Route path="/" element={
              isAuthenticated ? <Navigate to="/classrooms" replace /> : <Navigate to="/login" replace />
            } />

            {/* Main application routes */}
            <Route path="/classrooms" element={
              <AuthenticatedRoute>
                <Classrooms />
              </AuthenticatedRoute>
            } />
            <Route path="/aulas/:id" element={
              <AuthenticatedRoute>
                <AulaDetail />
              </AuthenticatedRoute>
            } />
            <Route path="/history" element={
              <AuthenticatedRoute>
                <History />
              </AuthenticatedRoute>
            } />

            {/* Admin-only management routes */}
            <Route path="/admin/users" element={
              <AdminRoute>
                <Users />
              </AdminRoute>
            } />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </main>
      {!hideNavigation && <BottomNavigation />}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ToastProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AppContent />
          </Router>
        </ToastProvider>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App
