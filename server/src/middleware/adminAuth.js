import { createMiddleware } from 'hono/factory';

export const adminRequired = createMiddleware(async (c, next) => {
  const user = c.get('user');

  if (!user || user.role !== 'admin') {
    return c.json({ message: 'Forbidden: Administrator access required.' }, 403);
  }

  await next();
});
