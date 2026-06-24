import type { BotAvatarProps } from "../types"
import { cn } from "../lib/utils"

export function BotAvatar({ identity, className }: BotAvatarProps) {
  return (
    <div
      className={cn(
        "cp-avatar",
        className,
      )}
      aria-hidden="true"
    >
      {identity.name.charAt(0)}
    </div>
  )
}
