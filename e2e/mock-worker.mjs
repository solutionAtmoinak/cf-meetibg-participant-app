// Minimal stand-in for the deployed rtk-session Cloudflare Worker, used only
// by Playwright e2e tests. Implements just enough of the Worker's contract
// (create + fetch + join) for the create -> join smoke test; auth tokens are
// fake and never complete a real RealtimeKit connection.
import { createServer } from 'node:http';

const port = Number(process.env.MOCK_WORKER_PORT || 4501);
const teacherSecret = process.env.MOCK_TEACHER_SECRET || '';
const sessions = new Map();
let counter = 0;

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Teacher-Secret',
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  const { pathname } = url;
  const method = req.method ?? 'GET';

  if (method === 'OPTIONS') return send(res, 204, {});

  if (method === 'POST' && pathname === '/api/sessions') {
    const body = await readBody(req);
    const id = `mock-session-${++counter}`;
    const session = { id, title: body.title || 'Untitled', status: 'ACTIVE' };
    sessions.set(id, session);
    return send(res, 201, { success: true, session });
  }

  const getMatch = pathname.match(/^\/api\/sessions\/([^/]+)$/);
  if (method === 'GET' && getMatch) {
    const session = sessions.get(getMatch[1]);
    if (!session) return send(res, 404, { success: false, error: 'No session found' });
    return send(res, 200, { success: true, session });
  }

  const joinMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/join$/);
  if (method === 'POST' && joinMatch) {
    const session = sessions.get(joinMatch[1]);
    if (!session) return send(res, 404, { success: false, error: 'No session found' });
    const isTeacher = teacherSecret.length > 0 && req.headers['x-teacher-secret'] === teacherSecret;
    return send(res, 200, {
      success: true,
      authToken: 'fake-token-not-a-real-jwt',
      participantId: `p-${Date.now()}`,
      presetName: isTeacher ? 'webinar-teacher-host' : 'webinar-student-viewer',
      role: isTeacher ? 'teacher' : 'student',
    });
  }

  return send(res, 404, { success: false, error: 'Not found' });
});

server.listen(port, () => {
  console.log(`[mock-worker] listening on ${port}`);
});
