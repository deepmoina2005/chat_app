import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setUser, setLoading } from '@/store/slices/authSlice'
import { authClient } from '@/lib/auth-client'
import LoginPage from '@/pages/Login'
import RegisterPage from '@/pages/Register'
import DashboardPage from '@/pages/Dashboard'
import DiscoverPage from '@/pages/Discover'
import ProfilePage from '@/pages/Profile'
import Layout from '@/components/Layout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await authClient.getSession();
        if (data?.user) {
          dispatch(setUser(data.user));
        } else {
          dispatch(setLoading(false));
        }
      } catch (error) {
        dispatch(setLoading(false));
      }
    };
    checkAuth();
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
