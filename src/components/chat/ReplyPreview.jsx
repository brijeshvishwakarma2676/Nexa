/**
 * ReplyPreview - Shows the message being replied to in chat input
 */
import { X } from "lucide-react";
import { useChatStore } from "../../stores/chatStore";

const ReplyPreview = () => {
  const { replyingTo, clearReplyingTo } = useChatStore();

  if (!replyingTo) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-t border-gray-100">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-8 bg-indigo-500 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-indigo-600">
              Replying to {replyingTo.sender?.display_name || "Message"}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {replyingTo.media_type ? (
                <span className="inline-flex items-center gap-1">
                  {replyingTo.media_type === "image" && "📷 Photo"}
                  {replyingTo.media_type === "video" && "🎬 Video"}
                  {replyingTo.media_type === "audio" && "🎤 Voice message"}
                  {replyingTo.media_type === "file" && "📎 File"}
                </span>
              ) : (
                replyingTo.content
              )}
            </p>
          </div>
        </div>
      </div>
      <button
        onClick={clearReplyingTo}
        className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
        title="Cancel reply"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
};

export default ReplyPreview;
