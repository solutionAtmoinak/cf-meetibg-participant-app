import { useState } from 'react';
import { Landing, type JoinedState } from './components/Landing.js';
import { Classroom } from './components/Classroom.js';
import { ToastProvider } from './lib/toast.js';

export function App(): JSX.Element {
  const [joined, setJoined] = useState<JoinedState | null>(null);

  return (
    <ToastProvider>
      {joined ? (
        <Classroom joined={joined} onLeft={() => setJoined(null)} />
      ) : (
        <Landing onJoined={setJoined} />
      )}
    </ToastProvider>
  );
}
