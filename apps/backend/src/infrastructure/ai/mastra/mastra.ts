import { Mastra } from "@mastra/core";
import { chatAssistantAgent, chatAssistantAgentName } from "./assistant.agent";
import { getMastraStorage } from "./chat.memory";

let mastraInstance: Mastra | undefined;

export const getMastra = () => {
  mastraInstance ??= new Mastra({
    agents: {
      [chatAssistantAgentName]: chatAssistantAgent,
    },
    storage: getMastraStorage(),
    logger: false,
  });

  return mastraInstance;
};
