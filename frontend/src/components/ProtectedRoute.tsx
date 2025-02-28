 

// src/components/ProtectedRoute.tsx
import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuthHook';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isVerifying, isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isVerifying) {
      if (!isLoggedIn) {
        // Redirect to login while saving the attempted location
        navigate('/login', { state: { from: location }, replace: true });
        return;
      }

      if (user && !allowedRoles.includes(user.role)) {
        navigate('/unauthorized', { replace: true });
        return;
      }
    }
  }, [isVerifying, isLoggedIn, user, allowedRoles, navigate, location]);

  // Show nothing while verifying authentication
  if (isVerifying) return null;
  
  // If we're not verifying and we have a user with the correct role, render children
  if (isLoggedIn && user && allowedRoles.includes(user.role)) {
    return <>{children}</>;
  }

  return null;
};

export default ProtectedRoute;


// import { ReactNode, useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import api from '../utils/api/axios';

// interface ProtectedRouteProps {
//   children: ReactNode;
//   allowedRoles: string[];
// }

// const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
//   const navigate = useNavigate();
//   const [loading, setLoading] = useState(true);
//   const token = sessionStorage.getItem('accessToken'); // Ensure this matches your login storage key

//   useEffect(() => {
//     const verifyToken = async () => {
//       if (!token) {
//         navigate('/login');
//         return;
//       }

//       try {
//         // Set up Axios with the token
//         api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

//         // Call backend to verify token and get user role
//         const response = await api.get('/auth/verify'); // Adjust API endpoint as needed

//         // Check if the user's role is allowed
//         if (!allowedRoles.includes(response.data.role)) {
//           navigate('/unauthorized');
//           return;
//         }

//         setLoading(false);
//       } catch (error) {
//         console.error('Token verification failed:', error);
//         sessionStorage.removeItem('accessToken');
//         navigate('/login');
//       }
//     };

//     verifyToken();
//   }, [token, navigate, allowedRoles]); // Ensure allowedRoles is in the dependency array

//   // Show nothing while checking authentication status
//   if (loading) return null;

//   return <>{children}</>;
// };

// export default ProtectedRoute;
