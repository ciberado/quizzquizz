import path from "node:path";

import { config } from "dotenv";

const defaultEnvPath = path.resolve(process.cwd(), ".env");

config({
  path: defaultEnvPath,
});
