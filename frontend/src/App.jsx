import { useState } from 'react';
import StudentIdentification from './components/StudentIdentification';
import ClassListing from './components/ClassListing';
import './App.css'

function App() {
  const [page, setPage] = useState('identification');

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
