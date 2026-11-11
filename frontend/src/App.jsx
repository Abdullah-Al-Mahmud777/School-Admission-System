import { useState } from 'react';
import StudentIdentification from './components/StudentIdentification';
import ClassListing from './components/ClassListing';
import AdminLogin from './components/AdminLogin';
import './App.css'

const ADMIN_LOGIN_PATHS = ['/admin', '/admin/login'];

function App() {
  const [page, setPage] = useState('identification');
  const isAdminLogin = ADMIN_LOGIN_PATHS.includes(
    window.location.pathname.replace(/\/+$/, ''),
  );

  if (isAdminLogin) {
    return <AdminLogin />;
  }

  return (
    <div id="root">
      {page === 'identification' ? (
        <StudentIdentification onIdentified={() => setPage('classes')} />
      ) : (
        <ClassListing onSignOut={() => setPage('identification')} />
      )}
    </div>
  );
}

export default App;
