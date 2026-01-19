/**
 * MessageBubble - Chat message component with delivery status ticks
 *
 * Features:
 * - Delivery status ticks (sending, sent, delivered, read)
 * - Message reply preview
 * - Media display (images, videos, files)
 * - Emoji reactions
 * - Delete/forward options
 */
import { useState, useRef } from "react";
import {
  Clock,
  Check,
  CheckCheck,
  Reply,
  Forward,
  Trash2,
  MoreVertical,
  Play,
  File,
  Mic,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { useChatStore } from "../../stores/chatStore";
import { useAuthStore } from "../../stores/authStore";

// Status tick icons
const StatusTick = ({ status }) => {
  const s = status?.toLowerCase();
  switch (s) {
    case "sending":
      return <Clock className="w-3.5 h-3.5 text-gray-400" />;
    case "sent":
      return <Check className="w-3.5 h-3.5 text-gray-400" />;
    case "delivered":
      return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
    case "read":
      return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
    case "failed":
      return <X className="w-3.5 h-3.5 text-red-500" />;
    default:
      return <Check className="w-3.5 h-3.5 text-gray-400" />;
  }
};

// Quick reaction emoji bar
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const MessageBubble = ({
  message,
  isOwn,
  showAvatar = true,
  onReply,
  onForward,
  onDelete,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const { reactToMessage, setReplyingTo, pendingReactions } = useChatStore();
  const { user } = useAuthStore();
  const actionsRef = useRef(null);

  // Check if current user has reacted with a specific emoji
  const getUserReaction = (emoji) => {
    return message.reactions?.find(
      (r) => r.user_id === user?.id && r.emoji === emoji,
    );
  };

  // Get all emojis the current user has reacted with
  const userReactedEmojis = new Set(
    message.reactions
      ?.filter((r) => r.user_id === user?.id)
      .map((r) => r.emoji) || [],
  );

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleReaction = (emoji) => {
    // Toggle: if user already reacted with this emoji, remove it
    if (userReactedEmojis.has(emoji)) {
      reactToMessage(message.id, null); // null removes the reaction
    } else {
      reactToMessage(message.id, emoji);
    }
    setShowReactions(false);
  };

  const handleReply = () => {
    setReplyingTo(message);
    setShowActions(false);
    onReply?.(message);
  };

  const handleForward = () => {
    setShowActions(false);
    onForward?.(message);
  };

  const handleDelete = (forEveryone = false) => {
    setShowActions(false);
    onDelete?.(message.id, forEveryone);
  };

  // Render media content
  const renderMedia = () => {
    if (!message.media_url) return null;

    switch (message.media_type) {
      case "image":
        return (
          <div className="mb-1.5 rounded-lg overflow-hidden max-w-xs">
            <img
              src={message.media_url}
              alt="Shared image"
              className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.media_url, "_blank")}
            />
          </div>
        );

      case "video":
        return (
          <div className="mb-1.5 rounded-lg overflow-hidden max-w-xs relative">
            <video
              src={message.media_url}
              className="w-full h-auto"
              controls
              poster={message.media_thumbnail_url}
            />
            {message.media_duration && (
              <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                {Math.floor(message.media_duration / 60)}:
                {String(message.media_duration % 60).padStart(2, "0")}
              </span>
            )}
          </div>
        );

      case "audio":
        return (
          <div className="mb-1.5 flex items-center gap-2 bg-gray-100 rounded-lg p-2 min-w-[200px]">
            <button className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white">
              <Play className="w-5 h-5 ml-0.5" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <Mic className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Voice message</span>
              </div>
              {message.media_duration && (
                <span className="text-xs text-gray-400">
                  {Math.floor(message.media_duration / 60)}:
                  {String(message.media_duration % 60).padStart(2, "0")}
                </span>
              )}
            </div>
          </div>
        );

      case "file":
        return (
          <a
            href={message.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-1.5 flex items-center gap-2 bg-gray-100 rounded-lg p-3 hover:bg-gray-200 transition-colors"
          >
            <File className="w-8 h-8 text-indigo-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {message.media_file_name || "Document"}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(message.media_file_size)}
              </p>
            </div>
          </a>
        );

      default:
        return null;
    }
  };

  // Render reply preview
  const renderReplyPreview = () => {
    if (!message.reply_to) return null;

    return (
      <div
        className={`mb-1.5 px-2 py-1.5 rounded-lg border-l-2 ${
          isOwn
            ? "bg-indigo-600/20 border-white/50"
            : "bg-gray-100 border-indigo-400"
        }`}
      >
        <p
          className={`text-xs font-medium ${isOwn ? "text-white/80" : "text-indigo-600"}`}
        >
          {message.reply_to.sender?.display_name || "User"}
        </p>
        <p
          className={`text-xs truncate ${isOwn ? "text-white/60" : "text-gray-500"}`}
        >
          {message.reply_to.content}
        </p>
      </div>
    );
  };

  // Render reactions
  const renderReactions = () => {
    if (!message.reactions || message.reactions.length === 0) return null;

    // Group reactions by emoji
    const grouped = message.reactions.reduce((acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = { count: 0, userReacted: false };
      }
      acc[r.emoji].count += 1;
      if (r.user_id === user?.id) {
        acc[r.emoji].userReacted = true;
      }
      return acc;
    }, {});

    const isPending = pendingReactions.has(message.id);

    return (
      <div
        className={`absolute -bottom-3 ${isOwn ? "right-2" : "left-2"} flex flex-wrap gap-1 z-10 ${isPending ? "opacity-70 pointer-events-none" : ""}`}
      >
        <div
          className={`flex items-center gap-0.5 bg-white shadow-sm border border-gray-100 rounded-full px-1.5 py-0.5 hover:shadow-md transition-shadow ${isPending ? "animate-pulse ring-2 ring-indigo-400 ring-offset-1" : ""}`}
        >
          {Object.entries(grouped).map(([emoji, { count, userReacted }]) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`group/emoji flex items-center gap-0.5 hover:scale-110 transition-transform rounded-full px-1 ${
                userReacted ? "bg-white shadow-sm border border-gray-200" : ""
              }`}
              title={
                userReacted
                  ? "Click to remove your reaction"
                  : `Reacted ${count} times`
              }
            >
              <span className="text-[13px]">{emoji}</span>
              {count > 1 && (
                <span className="text-[10px] font-bold text-gray-500">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Deleted message
  if (message.is_deleted && message.deleted_for_everyone) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
        <div className="px-3 py-2 rounded-2xl bg-gray-100 text-gray-400 italic text-sm border border-gray-200">
          This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex ${isOwn ? "justify-end" : "justify-start"} mb-4 relative px-4`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactions(false);
      }}
    >
      {/* Avatar for other user */}
      {!isOwn && showAvatar && (
        <div className="w-8 h-8 rounded-full mr-2 flex-shrink-0 self-end mb-1">
          <img
            src={
              message.sender?.avatar_url ||
              `https://ui-avatars.com/api/?name=${message.sender?.username}&background=random`
            }
            alt={message.sender?.display_name}
            className="w-full h-full rounded-full object-cover shadow-sm"
          />
        </div>
      )}

      <div
        className={`relative max-w-[75%] ${!isOwn && showAvatar && !message.sender?.avatar_url ? "ml-10" : ""}`}
      >
        {/* Message bubble */}
        <div
          className={`relative px-4 py-2.5 rounded-2xl shadow-sm ${
            isOwn
              ? "bg-indigo-600 text-white rounded-br-none"
              : "bg-gray-100 text-gray-900 rounded-bl-none border border-gray-200"
          } ${message.status?.toLowerCase() === "failed" ? "opacity-60" : ""}`}
        >
          {/* Forwarded indicator */}
          {message.forwarded_from_id && (
            <p
              className={`text-[10px] mb-1 flex items-center gap-1 font-medium ${isOwn ? "text-white/70" : "text-gray-500"}`}
            >
              <Forward className="w-3 h-3" />
              Forwarded
            </p>
          )}

          {/* Reply preview */}
          {renderReplyPreview()}

          {/* Media content */}
          {renderMedia()}

          {/* Text content */}
          {message.content && !message.is_deleted && (
            <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap">
              {message.content}
            </p>
          )}

          {/* Time and status */}
          <div
            className={`flex items-center gap-1 mt-1.5 ${isOwn ? "justify-end" : "justify-start"}`}
          >
            <span
              className={`text-[10px] font-medium ${isOwn ? "text-white/60" : "text-gray-400"}`}
            >
              {formatTime(message.created_at)}
            </span>
            {isOwn && <StatusTick status={message.status} />}
          </div>
        </div>

        {/* Reactions (Overlapping) */}
        {renderReactions()}

        {/* Action buttons (Now pinned to bubble) */}
        {showActions && !message.is_deleted && (
          <div
            ref={actionsRef}
            className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200 ${
              isOwn ? "right-full mr-2" : "left-full ml-2"
            }`}
          >
            {/* Quick reaction button */}
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1.5 bg-white/90 backdrop-blur-sm shadow-md rounded-full hover:bg-white hover:scale-110 transition-all border border-gray-100"
              title="React"
            >
              <span className="text-sm leading-none">😊</span>
            </button>

            {/* Reply button */}
            <button
              onClick={handleReply}
              className="p-1.5 bg-white/90 backdrop-blur-sm shadow-md rounded-full hover:bg-white hover:scale-110 transition-all border border-gray-100"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5 text-gray-600" />
            </button>

            {/* More options */}
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1.5 bg-white/90 backdrop-blur-sm shadow-md rounded-full hover:bg-white hover:scale-110 transition-all border border-gray-100"
            >
              <MoreVertical className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>
        )}

        {/* Quick reaction bar (Now pinned to bubble) */}
        {showReactions && (
          <div
            className={`absolute -top-12 z-20 bg-white/95 backdrop-blur-md shadow-xl rounded-full px-2 py-1.5 flex gap-1 border border-gray-100 animate-in zoom-in-75 slide-in-from-bottom-2 duration-200 ${
              isOwn ? "right-0" : "left-0"
            } ${pendingReactions.has(message.id) ? "opacity-50 pointer-events-none" : ""}`}
          >
            {QUICK_REACTIONS.map((emoji) => {
              const isSelected = userReactedEmojis.has(emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={`p-1 px-1.5 rounded-full transition-all text-xl duration-200 ${
                    isSelected
                      ? "bg-white shadow-md border border-gray-200 scale-110"
                      : "hover:bg-indigo-50 hover:scale-150"
                  }`}
                  title={isSelected ? "Remove reaction" : "React"}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
