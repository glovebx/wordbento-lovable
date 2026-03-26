
import { HTTPException } from 'hono/http-exception';

export const errorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error(err);
  return c.json({ message: 'Internal Server Error' }, 500);
};
