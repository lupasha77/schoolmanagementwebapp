// AppRoutes.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Layout from './Layout';
import EmailVerification from './components/EmailsComponent';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboardPage from './pages/admin/AdminDashboard';
import StaffDashboard from './pages/staff/StaffDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
// import ConsolidatedTimetable from './components/ConsolidatedTimeTable';
import Timetable from './components/timetable/TimeTableComponent';
import TimetablePages from './pages/admin/TimeTablePages';
import CreateTimetable from './components/timetable/TimeTableComponent';
import { UserProfile } from './components/profile/UserProfile'; 
import FakeDataGeneratorPage from './pages/FakeDataGenerator';
import { TimetableViews } from './components/ConsolidatedTimeTables';

const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />}/>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email/:token" element={<EmailVerification />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/profile" element={<UserProfile/>} />
          {/* <Route path="/dashboard/timetable/consolidated" element={<ConsolidatedTimetable timetable={}/>} /> */}
          <Route path="/admin-dashboard/timetable/create-timetable" element={<CreateTimetable />} />
          <Route path="/admin-dashboard/timetable/view" element={<TimetableViews />} />
           
          <Route path="/admin-dashboard/timetable/view-timetable" element={<Timetable />} />
          <Route path="/admin-dashboard/timetable/generate" element={<TimetablePages />} />
          <Route path="/admin-dashboard/fake-data" element={<FakeDataGeneratorPage />} />
          
            
              <Route path="/admin-dashboard" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/staff-dashboard" element={
                <ProtectedRoute allowedRoles={['admin', 'staff']}>
                  <StaffDashboard />
                </ProtectedRoute>
              } />
              <Route path="/student-dashboard" element={
                <ProtectedRoute allowedRoles={['admin', 'student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              } />
            
            
        </Routes>
      </Layout>
    </Router>
  );
}

export default AppRoutes;
