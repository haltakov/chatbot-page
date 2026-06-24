"use client"

import { MessageSquarePlus, Trash2, X } from "lucide-react"
import { cn } from "../lib/utils"
import { BotAvatar } from "./bot-avatar"
import { ThemeToggle } from "./theme-toggle"
import { GetInTouch } from "./get-in-touch"
import type { Conversation } from "../lib/chat-store"
import type { ResolvedChatbotConfig } from "../types"

export function ChatSidebar({
  conversations,
  activeId,
  config,
  onNewChat,
  onSelect,
  onDelete,
  onContactSubmit,
  open,
  onClose,
}: {
  conversations: Conversation[]
  activeId: string | null
  config: ResolvedChatbotConfig
  onNewChat: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onContactSubmit: (email: string) => Promise<void> | void
  open: boolean
  onClose: () => void
}) {
  const Avatar = config.components.BotAvatar ?? BotAvatar

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="cp-sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "cp-sidebar",
          open && "cp-sidebar--open",
        )}
      >
        <div className="cp-sidebar-header">
          <div className="cp-sidebar-identity">
            <Avatar identity={config.identity} className="cp-avatar" />
            <div className="cp-sidebar-identity-text">
              <div className="cp-sidebar-name">{config.identity.name}</div>
              {config.identity.handle && (
                <div className="cp-sidebar-handle">@{config.identity.handle}</div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cp-icon-button cp-sidebar-close"
            aria-label="Close sidebar"
          >
            <X className="cp-icon cp-icon--sm" aria-hidden="true" />
          </button>
        </div>

        <div className="cp-sidebar-actions">
          <button
            type="button"
            onClick={onNewChat}
            className="cp-button cp-button--secondary cp-button--full"
          >
            <MessageSquarePlus className="cp-icon cp-icon--sm" aria-hidden="true" />
            {config.ui.newChatLabel}
          </button>
        </div>

        <nav className="cp-conversation-nav">
          {conversations.length === 0 ? (
            <p className="cp-empty-conversations">
              {config.ui.emptyConversationsLabel}
            </p>
          ) : (
            <ul className="cp-conversation-list">
              {conversations.map((c) => (
                <li key={c.id}>
                  <div
                    className={cn(
                      "cp-conversation-item",
                      c.id === activeId && "cp-conversation-item--active",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      className="cp-conversation-select"
                    >
                      {c.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(c.id)}
                      className="cp-conversation-delete"
                      aria-label={`Delete conversation: ${c.title}`}
                    >
                      <Trash2 className="cp-icon cp-icon--sm" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div className="cp-sidebar-footer">
          {config.ui.contact && (
            <GetInTouch
              Avatar={Avatar}
              contact={config.ui.contact}
              identity={config.identity}
              onSubmitEmail={onContactSubmit}
            />
          )}
          <div className="cp-theme-row">
            <ThemeToggle
              storage={config.storage.keyValueStore}
              storageKey={config.storage.themeKey}
            />
          </div>
        </div>
      </aside>
    </>
  )
}
