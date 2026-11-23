export type ConversationSummary = {
  id: number;
  kind: "dm" | "room" | "group";
  name: string;
  initials: string;
  avatar: string;
  online: boolean;
  status: string;
  /** ISO time the other member was last seen, when offline. */
  lastSeenAt?: string | null;
  preview: string;
  lastAt: string | null;
  unread: number;
  /** Username of the other member for DMs (for the profile link). */
  otherScreenName: string | null;
  /** A video call going on in this conversation right now. */
  liveCall: { id: number; count: number; max: number } | null;
};

export type MemberView = {
  id: string;
  screenName: string;
  username: string;
  initials: string;
  avatar: string;
  online: boolean;
};

export type ThreadMessage = {
  id: number;
  kind: "text" | "system";
  body: string;
  senderName: string;
  mine: boolean;
  at: string;
  heartCount: number;
  heartedByMe: boolean;
};

export type ChatState = {
  list: ConversationSummary[];
  current: ConversationSummary;
  messages: ThreadMessage[];
  readUpTo: number;
  typing: string | null;
  unreadTotal: number;
  onlineCount: number;
  /** Group members (groups only). */
  members: MemberView[] | null;
};

export type ChatListState = Pick<ChatState, "list" | "unreadTotal" | "onlineCount">;
