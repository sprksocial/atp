import { ErrorFrame, MessageFrame } from "./frames.ts";
import type { Auth, Params, StreamConfig } from "../types.ts";

/**
 * Handles WebSocket connections for XRPC streaming subscriptions.
 * Encapsulates connection lifecycle, authentication, parameter validation, and message handling.
 */
export class StreamConnection {
  private socket: WebSocket;
  private abortController: AbortController;
  private nsid: string;
  private config: StreamConfig;
  private paramVerifier: (req: Request) => Params;
  private originalRequest: Request;

  constructor(
    socket: WebSocket,
    nsid: string,
    config: StreamConfig,
    paramVerifier: (req: Request) => Params,
    originalRequest: Request,
  ) {
    this.socket = socket;
    this.nsid = nsid;
    this.config = config;
    this.paramVerifier = paramVerifier;
    this.originalRequest = originalRequest;
    this.abortController = new AbortController();

    // Set up connection lifecycle handlers
    this.setupSocketHandlers();
  }

  /**
   * Sets up WebSocket event handlers for the connection.
   */
  private setupSocketHandlers(): void {
    this.socket.onopen = () => {
      // Connection established - start handling the stream
      this.handleConnection().catch((error) => {
        console.error("StreamConnection error:", error);
        this.close(1011, "Internal error");
      });
    };

    this.socket.onerror = (ev: Event) => {
      console.error("WebSocket error:", ev);
    };

    this.socket.onclose = () => {
      this.abortController.abort();
    };
  }

  /**
   * Main connection handler that processes authentication, validation, and streaming.
   */
  private async handleConnection(): Promise<void> {
    const req = this.originalRequest;

    // Get query parameters for handler
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);

    try {
      // Perform authentication if configured
      const auth = await this.authenticate(params, req);

      // Validate parameters
      this.validateParameters(req);

      // Execute the streaming handler
      await this.executeHandler(params, auth, req);
    } catch (error) {
      if (error instanceof StreamAuthError) {
        this.sendErrorAndClose("AuthenticationRequired", error.message);
      } else if (error instanceof StreamValidationError) {
        this.sendErrorAndClose("InvalidRequest", error.message);
      } else if (error instanceof StreamHandlerError) {
        this.sendErrorAndClose("InternalServerError", error.message);
      } else {
        this.sendErrorAndClose(
          "InternalServerError",
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }

  /**
   * Performs authentication if an auth verifier is configured.
   */
  private async authenticate(
    params: Record<string, string>,
    req: Request,
  ): Promise<Auth | undefined> {
    if (!this.config.auth) {
      return undefined;
    }

    try {
      const auth = await this.config.auth({ params, req });
      return auth as Auth;
    } catch {
      throw new StreamAuthError("Authentication Required");
    }
  }

  /**
   * Validates request parameters using the configured parameter verifier.
   */
  private validateParameters(req: Request): void {
    try {
      this.paramVerifier(req);
    } catch (error) {
      throw new StreamValidationError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Executes the streaming handler and processes yielded data.
   * @param params - The request's parameters.
   * @param auth - The request's authentication state.
   * @param req - The raw request object.
   */
  private async executeHandler(
    params: Record<string, string>,
    auth: Auth | undefined,
    req: Request,
  ): Promise<void> {
    const handler = this.config.handler;
    if (!handler) {
      throw new StreamHandlerError("No handler configured for this method");
    }

    const handlerContext = {
      params,
      auth: auth as Auth,
      req,
      signal: this.abortController.signal,
    };

    try {
      for await (const data of handler(handlerContext)) {
        if (this.abortController.signal.aborted) break;

        // Check if the yielded data is already a Frame object
        if (data instanceof ErrorFrame) {
          this.socket.send(data.toBytes());
          this.close(1011, data.body.error);
          return;
        }

        if (data instanceof MessageFrame) {
          this.socket.send(data.toBytes());
          continue;
        }

        // Process regular data objects
        const frame = this.createMessageFrame(data);
        this.socket.send(frame.toBytes());
      }

      // Handler completed normally, close connection immediately
      this.close(1000, "Stream completed");
    } catch (handlerError) {
      throw new StreamHandlerError(
        handlerError instanceof Error
          ? handlerError.message
          : String(handlerError),
      );
    }
  }

  /**
   * Creates a MessageFrame from yielded data, handling $type extraction and normalization.
   */
  private createMessageFrame(data: unknown): MessageFrame {
    let frameType: string | undefined;
    let frameBody = data;

    if (data && typeof data === "object" && "$type" in data) {
      const rawType = String(data.$type);

      // Normalize type: if it starts with current nsid, convert to short form
      if (rawType.startsWith(`${this.nsid}#`)) {
        frameType = rawType.substring(this.nsid.length);
      } else {
        frameType = rawType;
      }

      // Remove $type from the body
      const { $type: _$type, ...bodyWithoutType } = data as Record<
        string,
        unknown
      >;
      frameBody = bodyWithoutType;
    }

    return new MessageFrame(
      frameBody as Record<string, unknown>,
      frameType ? { type: frameType } : undefined,
    );
  }

  /**
   * Sends an error frame and closes the connection.
   */
  private sendErrorAndClose(error: string, message: string): void {
    const errorFrame = new ErrorFrame({ error, message });
    this.socket.send(errorFrame.toBytes());
    this.close(1011, error);
  }

  /**
   * Closes the WebSocket connection with the specified code and reason.
   */
  private close(code: number, reason: string): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.close(code, reason);
    }
  }

  /**
   * Creates a StreamConnection and returns the WebSocket response for upgrade.
   * This is the main entry point for creating WebSocket connections.
   */
  static upgrade(
    request: Request,
    nsid: string,
    config: StreamConfig,
    paramVerifier: (req: Request) => Params,
  ): Response {
    const upgrade = request.headers.get("upgrade");
    if (upgrade !== "websocket") {
      throw new Error("WebSocket upgrade required");
    }

    // Handle WebSocket upgrade using Deno's built-in WebSocket API
    const { socket, response } = Deno.upgradeWebSocket(request);

    // Create the connection handler
    new StreamConnection(socket, nsid, config, paramVerifier, request);

    return response;
  }
}

/**
 * Error thrown when authentication fails.
 */
class StreamAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StreamAuthError";
  }
}

/**
 * Error thrown when parameter validation fails.
 */
class StreamValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StreamValidationError";
  }
}

/**
 * Error thrown when handler execution fails.
 */
class StreamHandlerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StreamHandlerError";
  }
}
