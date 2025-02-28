// useDashboardData.ts
import { useState, useEffect } from 'react';
import api  from '../utils/api/axios';
 
import { useAuth } from './useAuthHook';

interface Profile {
  firstName: string;
  lastName: string;
  user_email: string;
}

interface DashboardData {
   
  profile: Profile;
}

export const useDashboardData = () => {
  const { isLoggedIn } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true; // Prevent unnecessary re-renders
  
    if (!isLoggedIn) {
      setError('User authentication required. Please log in.');
      setLoading(false);
      return;
    }
  
    const fetchDashboardData = async () => {
      try {
        const profileRes = await api.get('/dashboard/profile');
        
        if (isMounted) {
          console.log("Profile API Response:", profileRes.data);
          setData({ profile: profileRes.data });
        }
  
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        if (isMounted) setError('Unable to load dashboard data. Please try again.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
  
    fetchDashboardData();
  
    return () => {
      isMounted = false; // Cleanup on unmount
    };
  }, [isLoggedIn]); // ✅ Only fetch when `isLoggedIn` changes
  
  
  return { data, loading, error };
};