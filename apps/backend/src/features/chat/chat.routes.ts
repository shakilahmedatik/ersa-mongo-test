import { createUIMessageStreamResponse } from "ai";
import { Hono } from "hono";
import type { AppBindings } from "../../app/bindings";
import { rateLimitChatMiddleware } from "./chat.rate-limit";
import { chatService } from "./chat.service";
import {
  parseChatStreamInput,
  parseChatThreadCreateInput,
  parseChatThreadUpdateInput,
  parseThreadId,
} from "./chat.validation";

export const chatRoutes = new Hono<AppBindings>();

chatRoutes.get("/", (context) => {
  return context.json(chatService.getDescriptor());
});

chatRoutes.get("/rate-limit", (context) => {
  const user = context.get("user");

  if (!user) {
    return context.json(
      {
        error: "Authentication required",
      },
      401,
    );
  }

  return context.json(chatService.getRateLimitStatus(user.id));
});

chatRoutes.get("/threads", async (context) => {
  const user = context.get("user");

  if (!user) {
    return context.json(
      {
        error: "Authentication required",
      },
      401,
    );
  }

  return context.json(await chatService.listThreads(user));
});

chatRoutes.post("/threads", async (context) => {
  const input = parseChatThreadCreateInput(
    await context.req.json().catch(() => undefined),
  );

  if (!input) {
    return context.json(
      {
        error: "Invalid thread payload",
      },
      400,
    );
  }

  const user = context.get("user");

  if (!user) {
    return context.json(
      {
        error: "Authentication required",
      },
      401,
    );
  }

  return context.json(await chatService.createThread(user, input), 201);
});

chatRoutes.patch("/threads", async (context) => {
  const input = parseChatThreadUpdateInput(await context.req.json());

  if (!input) {
    return context.json(
      {
        error: "threadId and at least one of title or preview are required",
      },
      400,
    );
  }

  const user = context.get("user");

  if (!user) {
    return context.json(
      {
        error: "Authentication required",
      },
      401,
    );
  }

  try {
    const payload = await chatService.updateThread(user, input);

    if (!payload) {
      return context.json(
        {
          error: "Thread not found",
        },
        404,
      );
    }

    return context.json(payload);
  } catch (error) {
    return context.json(
      {
        error: error instanceof Error ? error.message : "Invalid thread id",
      },
      400,
    );
  }
});

chatRoutes.delete("/threads", async (context) => {
  const threadId = parseThreadId(
    new URL(context.req.url).searchParams.get("threadId"),
  );

  if (!threadId) {
    return context.json(
      {
        error: "threadId query parameter is required",
      },
      400,
    );
  }

  const user = context.get("user");

  if (!user) {
    return context.json(
      {
        error: "Authentication required",
      },
      401,
    );
  }

  try {
    const deleted = await chatService.deleteThread(user, threadId);

    if (!deleted) {
      return context.json(
        {
          error: "Thread not found",
        },
        404,
      );
    }

    return context.json({
      success: true,
    });
  } catch (error) {
    return context.json(
      {
        error: error instanceof Error ? error.message : "Invalid thread id",
      },
      400,
    );
  }
});

chatRoutes.get("/history", async (context) => {
  const user = context.get("user");
  const threadId = parseThreadId(
    new URL(context.req.url).searchParams.get("threadId"),
  );

  if (!user) {
    return context.json(
      {
        error: "Authentication required",
      },
      401,
    );
  }

  if (!threadId) {
    return context.json(
      {
        error: "threadId query parameter is required",
      },
      400,
    );
  }

  try {
    const history = await chatService.getHistory({
      threadId,
      user,
    });

    return context.json(history);
  } catch (error) {
    context.var.logger.error(
      {
        err: error,
        authUserId: user.id,
        chatId: threadId,
      },
      "Chat history request failed",
    );

    return context.json(
      {
        error: "Unable to load chat history right now. Please try again.",
      },
      502,
    );
  }
});

chatRoutes.use("/stream", rateLimitChatMiddleware);

chatRoutes.post("/stream", async (context) => {
  const payload = parseChatStreamInput(await context.req.json());

  if (!payload) {
    return context.json(
      {
        error:
          "id and at least one AI SDK message are required for chat streaming",
      },
      400,
    );
  }

  const user = context.get("user");

  if (!user) {
    return context.json(
      {
        error: "Authentication required",
      },
      401,
    );
  }

  try {
    const stream = await chatService.stream({
      payload,
      user,
    });

    return createUIMessageStreamResponse({
      stream: stream as never,
    });
  } catch (error) {
    context.var.logger.error(
      {
        err: error,
        authUserId: user.id,
        chatId: payload.id,
      },
      "Chat stream request failed",
    );

    return context.json(
      {
        error: "Chat assistant is unavailable right now. Please try again.",
      },
      502,
    );
  }
});
