import { subsystemLogger } from "@atp/common";

export const logger: ReturnType<typeof subsystemLogger> = subsystemLogger(
  "repo",
);

export default logger;
