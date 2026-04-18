import "dotenv/config";
import { createServer } from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();
const server = createServer(app);

server.listen(env.port, () => {
  console.log(
    `[xelal-api] listening on http://localhost:${env.port} in ${env.nodeEnv} mode`,
  );
});
