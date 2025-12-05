import './App.css';
import EnterName from './pages/EnterName.tsx';
import SQLTutor from './pages/SQLTutor.tsx';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

function App() {
  const router = createBrowserRouter([
    { path: '/', element: <EnterName /> },
    { path: '/tutor', element: <SQLTutor /> },
  ])
  
  return (
    <div className="App">
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
