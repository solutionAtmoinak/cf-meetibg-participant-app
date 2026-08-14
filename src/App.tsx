import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing.js';
import { Classroom } from './pages/Classroom.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';
import { ToastProvider } from './lib/toast.js';

export function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/room" element={<Classroom />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
