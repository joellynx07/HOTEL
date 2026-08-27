/**
 * src/server.js
 * Entry point — binds the Express app to a port. Run with `npm run dev`
 * (nodemon) or `npm start` (plain node) from the backend/ folder.
 */

import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port, () => {
  console.log(`Spynx API listening on http://localhost:${env.port} (${env.nodeEnv})`);
});
