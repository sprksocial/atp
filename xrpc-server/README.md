# XRPC Server for Deno

A native Deno implementation of an XRPC server that can be used with
`deno.serve()`.

## Features

- Native Deno server implementation (no external HTTP framework dependencies)
- XRPC protocol support with lexicon validation
- Built-in rate limiting
- Authentication support
- Streaming subscriptions
- Error handling and validation

## Basic Usage

```typescript
import { createServer } from "./server.ts";
import type { HandlerContext, HandlerSuccess } from "./types.ts";

// Create a new XRPC server instance
const server = createServer();

// Add a query method (GET request)
server.method("com.example.getProfile", {
  handler: async (ctx: HandlerContext): Promise<HandlerSuccess> => {
    const { params } = ctx;

    return {
      encoding: "application/json",
      body: {
        id: params.id,
        name: "John Doe",
        email: "john@example.com",
      },
    };
  },
});

// Add a procedure method (POST request)
server.method("com.example.createPost", {
  handler: async (ctx: HandlerContext): Promise<HandlerSuccess> => {
    const { input, auth } = ctx;

    // Validate authentication
    if (!auth) {
      throw new Error("Authentication required");
    }

    return {
      encoding: "application/json",
      body: {
        success: true,
        postId: crypto.randomUUID(),
        content: input?.body?.text,
      },
    };
  },
});

// Start the server
Deno.serve({
  port: 8000,
  handler: server.handler,
});
```

## Server Configuration

```typescript
const server = createServer(lexicons, {
  // Custom error parser
  errorParser: (err) => {
    console.error("Server error:", err);
    return XRPCError.fromError(err);
  },

  // Custom catchall handler for unregistered routes
  catchall: async (req) => {
    return new Response("Custom 404", { status: 404 });
  },

  // Rate limiting configuration
  rateLimits: {
    creator: (options) => new SomeRateLimiter(options),
    global: [
      {
        name: "global",
        durationMs: 60000, // 1 minute
        points: 100, // 100 requests per minute
      },
    ],
    shared: [
      {
        name: "auth",
        durationMs: 300000, // 5 minutes
        points: 30, // 30 requests per 5 minutes
      },
    ],
  },
});
```

## Method Configuration

### Query Methods (GET requests)

```typescript
server.method("com.example.searchPosts", {
  handler: async ({ params }) => {
    const { q, limit = 10 } = params;

    // Search logic here
    const results = await searchPosts(q, limit);

    return {
      encoding: "application/json",
      body: { posts: results },
    };
  },

  // Optional authentication
  auth: async ({ req, params, input }) => {
    const token = req.headers.get("authorization");
    return await validateToken(token);
  },

  // Optional rate limiting
  rateLimit: {
    durationMs: 60000,
    points: 20,
  },
});
```

### Procedure Methods (POST requests)

```typescript
server.method("com.example.updateProfile", {
  handler: async ({ input, auth }) => {
    if (!auth?.user) {
      throw new Error("Authentication required");
    }

    const updatedProfile = await updateUserProfile(auth.user.id, input.body);

    return {
      encoding: "application/json",
      body: updatedProfile,
    };
  },

  auth: async ({ req }) => {
    // Custom auth logic
    return await authenticateUser(req);
  },
});
```

## Streaming Methods

```typescript
server.streamMethod("com.example.liveUpdates", {
  handler: async function* (req, signal) {
    while (!signal.aborted) {
      yield {
        type: "update",
        data: await getLiveData(),
      };

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  },
});
```

## Response Types

The handler can return different response types:

```typescript
// JSON response
return {
  encoding: "application/json",
  body: { message: "Hello World" },
};

// Binary response
return {
  encoding: "image/jpeg",
  buffer: imageBuffer,
};

// Stream response
return {
  encoding: "text/plain",
  stream: readableStream,
};

// Custom headers
return {
  encoding: "application/json",
  body: data,
  headers: {
    "Custom-Header": "value",
  },
};
```

## Error Handling

```typescript
import {
  InvalidRequestError,
  MethodNotImplementedError,
  XRPCError,
} from "./errors.ts";

server.method("com.example.riskyOperation", {
  handler: async (ctx) => {
    if (!ctx.params.id) {
      throw new InvalidRequestError("Missing required parameter: id");
    }

    try {
      const result = await performRiskyOperation(ctx.params.id);
      return {
        encoding: "application/json",
        body: result,
      };
    } catch (err) {
      throw XRPCError.fromError(err);
    }
  },
});
```

## Running the Server

```bash
# Basic server
deno run --allow-net server.ts

# With permissions for file access and environment variables
deno run --allow-net --allow-read --allow-env server.ts

# Production mode
deno run --allow-net --allow-read --allow-env --no-check server.ts
```

## Key Differences from Hono Version

1. **No external dependencies**: Uses native Deno server instead of Hono
2. **Direct handler**: The server's `handler` property is a function compatible
   with `deno.serve()`
3. **Simplified routing**: Routes are stored internally and matched directly
4. **Native Request/Response**: Uses standard Web API Request/Response objects
5. **Error handling**: Errors are converted to responses internally rather than
   thrown to middleware

## Migration from Hono

If you're migrating from a Hono-based XRPC server:

1. Remove Hono dependency from your imports
2. Replace `server.app` or `server.handler` with `server.handler`
3. Use `deno.serve()` instead of Hono's serve method
4. Update any custom middleware to work with the native request handler
