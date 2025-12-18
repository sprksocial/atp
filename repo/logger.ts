import { subsystemLogger } from "@atp/common/server";

export const logger: ReturnType<typeof subsystemLogger> = subsystemLogger(
  "repo",
);

export default logger;
