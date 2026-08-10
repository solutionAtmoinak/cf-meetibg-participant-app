import { useRealtimeKitSelector } from '@cloudflare/realtimekit-react';
import { ParticipantTile } from './ParticipantTile.js';
import { ScreenShareView } from './ScreenShareView.js';

export function TeacherView(): JSX.Element {
  const participants = useRealtimeKitSelector((m) => m.participants.joined.toArray());
  const sharer = participants.find((p) => p.screenShareEnabled);

  return (
    <section className="panel" aria-label="Teacher's video">
      <h2>Classroom</h2>
      {sharer && <ScreenShareView sharer={sharer} />}
      {participants.length === 0 ? (
        <p className="empty">Waiting for the teacher to share their camera or screen…</p>
      ) : (
        <div className="tile-grid">
          {participants.map((p) => (
            <ParticipantTile key={p.id} participant={p} />
          ))}
        </div>
      )}
    </section>
  );
}
