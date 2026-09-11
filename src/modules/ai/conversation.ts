import {
  appendMessage,
  createConversation,
  getConversation as getConversationRow,
  listMessages,
} from "./repository";

export async function startConversation(userId: string, purpose: string, title?: string) {
  return createConversation({ userId, purpose, title });
}

export async function addUserMessage(conversationId: string, content: string) {
  return appendMessage({ conversationId, role: "user", content });
}

export async function addAssistantMessage(conversationId: string, content: string) {
  return appendMessage({ conversationId, role: "assistant", content });
}

export async function getConversationHistory(conversationId: string) {
  return listMessages(conversationId);
}

export async function getConversation(conversationId: string) {
  return getConversationRow(conversationId);
}
