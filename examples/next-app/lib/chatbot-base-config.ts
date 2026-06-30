import type { ChatbotIdentity } from "chatbot-page";

export const persona: ChatbotIdentity & {
  tagline: string;
} = {
  name: "Vlad Haltakov",
  title: "Building products to make life simpler",
  tagline: "Ask me anything - this is my personal site, as a chatbot.",
  handle: "haltakov",
};
