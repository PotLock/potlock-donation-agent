import "server-only";

import { agentExecutor } from "./ai/chain";
import { exposeEndpoints, streamRunnableUI } from "./utils/server";
import { ChatMessage } from "@langchain/core/messages";
import {
  Runnable,
  RunnableConfig,
  RunnableLambda,
} from "@langchain/core/runnables";

async function agent(inputs: {
  input: string;
  chat_history: [role: string, content: string][];
}) {
  "use server";
  
  return streamRunnableUI(agentExecutor  as unknown as Runnable, {
    input: inputs.input,
    chat_history: inputs.chat_history.map(
      ([role, content]) => new ChatMessage(content, role),
    ),
  });
}

export const EndpointsContext = exposeEndpoints({ agent });
