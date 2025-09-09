import { createServer } from "./server.ts";
import type { HandlerContext, HandlerSuccess } from "./types.ts";

// Create a new XRPC server instance
const server = createServer();

// Add a simple query method
server.method("com.example.getStatus", {
  handler: async (_ctx: HandlerContext): Promise<HandlerSuccess> => {
    return {
      encoding: "application/json",
      body: {
        status: "ok",
        timestamp: new Date().toISOString(),
      },
    };
  },
});

// Add a simple procedure method
server.method("com.example.createPost", {
  handler: (ctx: HandlerContext): HandlerSuccess => {
    const { input } = ctx;

    return {
      encoding: "application/json",
      body: {
        success: true,
        message: "Post created successfully",
        data: input,
      },
    };
  },
});

// Start the Deno server
console.log("Starting XRPC server on port 8000...");

Deno.serve({
  port: 8000,
  handler: server.handler,
});
