import type { ChatbotIdentity } from "chatbot-page";

export const persona: ChatbotIdentity & {
  tagline: string;
} = {
  name: "Vladimir Haltakov",
  title: "Building products to make life simpler",
  tagline: "Ask me anything - this is my personal site, as a chatbot.",
  handle: "haltakov",
};

export const introMessage = `Hi, I'm **${persona.name}**.

I'm an AI and computer vision engineer based in Munich, and I build products at Creafex Lab.

This example keeps only a few short Markdown-backed answers. Unknown questions stream from the placeholder API route.`;
