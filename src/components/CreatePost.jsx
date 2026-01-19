import { useState, useRef, useEffect } from "react";
import {
  Image,
  Video,
  Smile,
  X,
  Loader2,
  MapPin,
  Users,
  Globe,
  ChevronDown,
  Plus,
  Camera,
  Lock,
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { useFeedStore } from "../stores/feedStore";
import api from "../services/api";

// No presets needed anymore

export default function CreatePost() {
  const { user } = useAuthStore();
  const { addPost } = useFeedStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [content]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isExpanded]);

  const [showPrivacyTooltip, setShowPrivacyTooltip] = useState(false);

  // Memoize privacy status
  const isPrivate = user?.is_private || false;

  // Close tooltip on scroll or outside click
  useEffect(() => {
    const handleClose = () => setShowPrivacyTooltip(false);
    if (showPrivacyTooltip) {
      window.addEventListener("click", handleClose);
      return () => window.removeEventListener("click", handleClose);
    }
  }, [showPrivacyTooltip]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
    setIsExpanded(true);
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !image) {
      setError("Please write something or add an image");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      let imageUrl = null;

      if (image) {
        const formData = new FormData();
        formData.append("file", image);

        const uploadResponse = await api.post("/posts/upload-image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        imageUrl = uploadResponse.data.image_url;
      }

      const response = await api.post("/posts", {
        content: content.trim(),
        image_url: imageUrl,
        visibility: isPrivate ? "friends" : "public",
      });

      addPost(response.data);

      // Reset form
      setContent("");
      removeImage();
      setIsExpanded(false);
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((e) => e.msg).join(", "));
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Failed to create post");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    if (!isLoading) {
      setIsExpanded(false);
      setContent("");
      removeImage();
      setError("");
      setShowPrivacyTooltip(false);
    }
  };

  return (
    <>
      {/* Quick Post Input */}
      <div className="bg-white rounded-2xl shadow-sm border border-(--color-border) p-4 mb-4 transition-all hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src={
                user?.avatar_url ||
                `https://ui-avatars.com/api/?name=${user?.username}&background=4F46E5&color=fff`
              }
              alt={user?.username}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent group-hover:ring-(--color-primary) transition-all"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
          </div>

          <button
            onClick={() => setIsExpanded(true)}
            className="flex-1 text-left px-5 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-all text-sm font-medium border border-(--color-border)"
          >
            What's on your mind, {user?.display_name || user?.username}?
          </button>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
          <div className="flex items-center gap-1 sm:gap-4 flex-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-xl transition-colors group"
            >
              <Image className="w-5 h-5 text-green-500 group-active:scale-90 transition-transform" />
              <span className="text-sm font-medium text-gray-600 hidden sm:inline">
                Photo
              </span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-xl transition-colors group">
              <Video className="w-5 h-5 text-red-500 group-active:scale-90 transition-transform" />
              <span className="text-sm font-medium text-gray-600 hidden sm:inline">
                Video
              </span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-xl transition-colors group">
              <Smile className="w-5 h-5 text-yellow-500 group-active:scale-90 transition-transform" />
              <span className="text-sm font-medium text-gray-600 hidden sm:inline">
                Feeling
              </span>
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(true)}
            className="shrink-0 p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-600 hover:text-white transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Expanded Post Modal / Bottom Sheet */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={closeModal}
        >
          <div
            className="bg-white w-full lg:max-w-xl rounded-t-3xl lg:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] lg:max-h-[min(800px,90vh)] animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab Handle for Mobile */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1 lg:hidden" />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 text-center flex-1">
                Create post
              </h2>
              <button
                onClick={closeModal}
                className="shrink-0 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {/* User info */}
              <div className="flex items-center gap-3 mb-6">
                <img
                  src={
                    user?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${user?.username}&background=4F46E5&color=fff`
                  }
                  alt={user?.username}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-50"
                />
                <div className="flex-1 relative">
                  <p className="font-bold text-gray-900 leading-tight">
                    {user?.display_name || user?.username}
                  </p>

                  {/* Privacy Status with Tooltip Trigger */}
                  <div className="relative inline-block">
                    <button
                      onMouseEnter={() => setShowPrivacyTooltip(true)}
                      onMouseLeave={() => setShowPrivacyTooltip(false)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPrivacyTooltip(!showPrivacyTooltip);
                      }}
                      className="flex items-center gap-1.5 mt-1 text-xs font-bold px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all active:scale-95"
                    >
                      {isPrivate ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <Globe className="w-3 h-3" />
                      )}
                      {isPrivate ? "Private" : "Public"}
                    </button>

                    {/* Detailed Tooltip */}
                    {showPrivacyTooltip && (
                      <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-[11px] rounded-xl shadow-2xl z-50 animate-fadeIn pointer-events-none">
                        <div className="font-bold mb-1 flex items-center gap-1">
                          {isPrivate ? (
                            <Lock className="w-3 h-3" />
                          ) : (
                            <Globe className="w-3 h-3" />
                          )}
                          Account is {isPrivate ? "Private" : "Public"}
                        </div>
                        <p className="text-gray-300 leading-relaxed">
                          {isPrivate
                            ? "Your account is private. Only your friends on Nexa can see your posts and activity. New followers must be approved by you."
                            : "Your account is public. Anyone on or off Nexa can see your posts, stories, and profile information. They can also follow you."}
                        </p>
                        <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content textarea with clean border container */}
              <div className="relative mt-3 min-h-[180px] flex flex-col group">
                {/* Glow / Focus Ring */}
                <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-indigo-500/30 via-purple-500/20 to-pink-500/30 opacity-0 group-within:opacity-100 blur transition duration-300 pointer-events-none" />

                {/* Main Editor */}
                <div className="relative flex-1 bg-white rounded-3xl border border-gray-200 group-within:border-transparent transition-all duration-300 p-5 shadow-sm group-within:shadow-xl">
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`What's on your mind, ${
                      user?.display_name?.split(" ")[0] || user?.username
                    }?`}
                    className={`w-full resize-none border-none bg-transparent focus:outline-none focus:ring-0 font-semibold leading-snug placeholder:text-gray-400 transition-all ${
                      content.length > 80 ? "text-lg" : "text-2xl"
                    } text-gray-900`}
                    rows={4}
                    autoFocus
                  />

                  {/* Subtle typing indicator */}
                  <div
                    className={`absolute bottom-3 right-4 text-xs font-medium transition-opacity ${
                      content.length > 0
                        ? "opacity-60 text-indigo-500"
                        : "opacity-0"
                    }`}
                  >
                    typing…
                  </div>
                </div>
              </div>

              {/* Image preview */}
              {imagePreview && (
                <div className="relative mt-4 rounded-2xl overflow-hidden ring-1 ring-gray-100 shadow-sm animate-fadeIn">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full object-cover max-h-[400px]"
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-full bg-white/90 shadow-lg text-gray-700 hover:bg-white transition-all active:scale-95"
                      title="Change photo"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                    <button
                      onClick={removeImage}
                      className="p-2.5 rounded-full bg-black/60 shadow-lg text-white hover:bg-black/80 transition-all active:scale-95"
                      title="Remove photo"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 animate-fadeIn">
                  <span className="text-red-600 text-sm font-medium">
                    {error}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="px-6 pb-4 lg:pb-6">
              <div className="flex flex-col gap-4">
                {/* Add to post section */}
                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-2xl bg-gray-50/50">
                  <span className="text-sm font-bold text-gray-700 ml-2">
                    Add to your post
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all group"
                      title="Photo/Video"
                    >
                      <Image className="w-6 h-6 text-green-500 group-active:scale-90 transition-transform" />
                    </button>
                    <button
                      className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all group"
                      title="Tag people"
                    >
                      <Users className="w-6 h-6 text-indigo-500 group-active:scale-90 transition-transform" />
                    </button>
                    <button
                      className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all group"
                      title="Feeling/Activity"
                    >
                      <Smile className="w-6 h-6 text-yellow-500 group-active:scale-90 transition-transform" />
                    </button>
                    <button
                      className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all group"
                      title="Check-in"
                    >
                      <MapPin className="w-6 h-6 text-red-500 group-active:scale-90 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Post Button */}
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || (!content.trim() && !image)}
                  className="w-full py-3.5 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-(--color-primary) text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-[0.98]"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Posting...</span>
                    </div>
                  ) : (
                    "Post"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
