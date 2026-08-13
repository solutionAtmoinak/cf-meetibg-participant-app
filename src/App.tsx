import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Landing } from './components/Landing.js';
import { Classroom } from './components/Classroom.js';
import { ToastProvider } from './lib/toast.js';

export function App(): JSX.Element {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/room" element={<Classroom />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
