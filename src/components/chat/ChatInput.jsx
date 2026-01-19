/**
 * ChatInput - Enhanced chat input with media upload, voice notes, emoji picker
 */
import { useState, useRef, useEffect } from "react";
import {
  Send,
  Paperclip,
  Mic,
  Image as ImageIcon,
  Smile,
  X,
  Square,
  Loader2,
} from "lucide-react";
import { useChatStore } from "../../stores/chatStore";
import ReplyPreview from "./ReplyPreview";
import api from "../../services/api";

const ChatInput = ({ conversationId }) => {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const { sendMessage, sendTyping, replyingTo } = useChatStore();
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  // Focus input when conversation changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId]);

  // Focus input when replying
  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  const handleSend = async () => {
    if (!message.trim() && !isRecording) return;

    await sendMessage(message.trim());
    setMessage("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    sendTyping();
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        stream.getTracks().forEach((track) => track.stop());

        // Upload and send
        await uploadAndSendMedia(
          audioBlob,
          "audio",
          `voice_${Date.now()}.webm`,
        );
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Update duration every second
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
      audioChunksRef.current = [];
    }
  };

  // File upload
  const handleFileSelect = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAttachMenu(false);
    await uploadAndSendMedia(file, type, file.name);
    e.target.value = ""; // Reset input
  };

  const uploadAndSendMedia = async (file, mediaType, fileName) => {
    setIsUploading(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", mediaType);

      // Upload to server (you'll need to implement this endpoint)
      const response = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { url, thumbnail_url, duration } = response.data;

      // Send message with media
      await sendMessage("", {
        mediaType,
        mediaUrl: url,
        mediaThumbnailUrl: thumbnail_url,
        mediaDuration: duration,
        mediaFileName: fileName,
        mediaFileSize: file.size,
      });
    } catch (err) {
      console.error("Failed to upload media:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="border-t border-gray-100 bg-white">
      {/* Reply preview */}
      <ReplyPreview />

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-3 px-4 py-2 bg-red-50 border-t border-red-100">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-red-600 font-medium">
            Recording... {formatDuration(recordingDuration)}
          </span>
          <div className="flex-1" />
          <button
            onClick={cancelRecording}
            className="p-1.5 hover:bg-red-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
          <button
            onClick={stopRecording}
            className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
          >
            <Square className="w-4 h-4 text-white fill-current" />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 p-3">
        {/* Attachment button */}
        <div className="relative">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isUploading}
          >
            <Paperclip className="w-5 h-5 text-gray-500" />
          </button>

          {/* Attachment menu */}
          {showAttachMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-white shadow-lg rounded-lg border border-gray-100 py-1 min-w-[140px]">
              <button
                onClick={() => imageInputRef.current?.click()}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700"
              >
                <ImageIcon className="w-4 h-4 text-green-500" />
                Photo/Video
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700"
              >
                <Paperclip className="w-4 h-4 text-blue-500" />
                Document
              </button>
            </div>
          )}

          {/* Hidden file inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) =>
              handleFileSelect(
                e,
                e.target.files?.[0]?.type.startsWith("video")
                  ? "video"
                  : "image",
              )
            }
          />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileSelect(e, "file")}
          />
        </div>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full px-4 py-2.5 bg-gray-100 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-shadow text-sm max-h-32"
            rows={1}
            disabled={isRecording || isUploading}
            style={{
              height: "auto",
              minHeight: "42px",
            }}
          />
        </div>

        {/* Emoji button */}
        <button
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Emoji"
        >
          <Smile className="w-5 h-5 text-gray-500" />
        </button>

        {/* Send or Record button */}
        {message.trim() || isUploading ? (
          <button
            onClick={handleSend}
            disabled={isUploading || !message.trim()}
            className="p-2.5 bg-indigo-500 hover:bg-indigo-600 rounded-full transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </button>
        ) : (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2.5 rounded-full transition-colors ${
              isRecording
                ? "bg-red-500 hover:bg-red-600"
                : "bg-indigo-500 hover:bg-indigo-600"
            }`}
          >
            <Mic className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
