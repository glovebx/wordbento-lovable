import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { drizzle } from 'drizzle-orm/d1';
import auth from './routes/auth.js';
import test from './routes/test.js';
import main from './routes/main.js';
import word from './routes/word.js';
import analyze from './routes/analyze.js';
import upload from './routes/upload.js';
import llm from './routes/llm.js';
// import rss from './routes/rss.js';
import {
  getCookie
} from 'hono/cookie'

const app = new Hono();

// Global Logging Middleware
app.use('*', async (c, next) => {
  console.log(`Received request: ${c.req.method} ${c.req.url}`);
  // console.log('ENV at Global Middleware:', c.env);
  await next();
});

// CORS Middleware
const allowedOrigins = ['https://your-app.com', 'http://localhost:1234', 'http://192.168.3.58:1234'];

app.use(
  '*',
  cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : undefined),
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'PUT', 'OPTIONS', 'DELETE'],
    credentials: true,
  })
);

// Public Routes
const publicRoutes = ['/api/auth/register', '/api/auth/login', '/api/auth/session', '/api/word/image', '/api/word/tts', '/api/test/check-db', '/api/test-kv-direct', '/ws/analyze', '/api/analyze/audio', '/api/analyze/srt'];
// 如果不登录则用public，否则用登录用户信息
const publicButPrivateRoutes = ['/api/word/search', '/api/analyze/history'];

// Authentication Middleware
app.use('/api/*', async (c, next) => {
  // console.log('WORDBENTO_KV in Middleware:', c.env.WORDBENTO_KV); // Debugging Line

  // Check if WORDBENTO_KV is properly bound
  if (!c.env.WORDBENTO_KV) {
    // console.error('WORDBENTO_KV binding is missing.');
    return c.json({ message: 'Internal Server Error: KV Namespace not bound.' }, 500);
  }

  // console.log('c.req.path:', c.req.path);

  // Check if the route is public
  if (publicRoutes.some(route => c.req.path.startsWith(route))) {
    return next();
  }

  // Manually parse the Cookie header
  const sessionId = getCookie(c, 'session_id')

  // console.log('Session ID from Cookie:', sessionId);

  if (!sessionId) {
    if (!publicButPrivateRoutes.some(route => c.req.path.startsWith(route))) {
      // console.warn('No session ID found in cookies.');
      return c.json({ message: 'Unauthorized: Missing session ID' }, 401);  
    }
    await next();
  } else {
    try {
      const userData = await c.env.WORDBENTO_KV.get(sessionId, { type: 'json' });
      // console.log('User Data Retrieved from KV:', userData);
      if (!userData) {
        // console.warn('Invalid session ID.');
        return c.json({ message: 'Unauthorized: Invalid session ID' }, 401);
      }
      c.set('user', userData);
      await next();
    } catch (err) {
      // console.error('Error verifying session:', err.message);
      return c.json({ message: 'Internal Server Error', error: err.message }, 500);
    }
  }
});


// Mount Sub-Routers Correctly
app.route('/api/auth', auth);
app.route('/api/test', test);
app.route('/api/main', main);
app.route('/api/word', word);
app.route('/api/upload', upload);
app.route('/api/analyze', analyze);
app.route('/api/llm', llm);
app.route('/ws/analyze', analyze);
// app.route('/api/rss', rss);

// Minimal Test Route for KV
app.get('/api/test-kv-direct', async (c) => {
  try {
    const kvNamespace = c.env.WORDBENTO_KV;
    if (!kvNamespace) {
      console.error('WORDBENTO_KV is undefined or invalid.');
      return c.json({ error: 'WORDBENTO_KV is undefined or invalid' }, 500);
    }

    // Attempt to get a test key
    const value = await kvNamespace.get('test_key');
    return c.json({ value });
  } catch (err) {
    console.error('Error accessing WORDBENTO_KV:', err);
    return c.json({ error: 'Failed to access WORDBENTO_KV', details: err.message }, 500);
  }
});

// Export the fetch handler with additional logging
export default {
  async fetch(request, env, ctx) {
    // console.log('Fetch handler invoked');
    // console.log('ENV in fetch:', env);
    return app.fetch(request, env, ctx);
  }
};