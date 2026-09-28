"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axiosClientInstance from "../../../lib/axiosInstance";
import { useSelector } from "react-redux";
import { RootState } from "../../../../store/store";
import TeacherChatInput from "./TeacherChatInput";
import { Paperclip, X } from "lucide-react";

interface ChatMessage {
  id: string;
  sender: { username: string };
  sender_name: string;
  message: string | null;
  file: string | null;
  is_pinned: boolean;
  created: string;
}

interface PinnedMessagesProps {
  groupId: string;
}

const PinnedMessages: React.FC<PinnedMessagesProps> = ({ groupId }) => {
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const isTeacher = user?.role === "teacher";

  const fetchPinnedMessages = async () => {
    try {
      const response = await axiosClientInstance.get(`/chat/`, {
        params: { group_id: groupId },
      });
      const pinned = response.data.results.pinned_messages;
      setPinnedMessages(pinned);
    } catch (error) {
      console.error("Error fetching pinned messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchPinnedMessages();
  };

  useEffect(() => {
    fetchPinnedMessages();
  }, [groupId]);

  const handleViewChat = () => {
    router.push(`/groups/allgroups/${groupId}/chat`);
  };

  const handleUnpin = async (messageId: string) => {
    try {
      await axiosClientInstance.patch(`/chat/${messageId}/`, {
        is_pinned: false,
      });
      setPinnedMessages(pinnedMessages.filter((msg) => msg.id !== messageId));
    } catch (error) {
      console.error("Error unpinning message:", error);
      alert("Failed to unpin message. Please try again.");
    }
  };

  return (
    <div>
      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : pinnedMessages.length === 0 ? (
        <p className="text-gray-500 text-sm">No pinned messages.</p>
      ) : (
        <ul className="space-y-3">
          {pinnedMessages.map((msg) => (
            <li
              key={msg.id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-start hover:bg-gray-100 transition-colors"
            >
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  <span className="font-semibold text-grey-900">
                    {msg.sender_name}
                  </span>{" "}
                  · {new Date(msg.created).toLocaleDateString()}
                </p>
                {msg.message && (
                  <p className="text-gray-800 text-sm">{msg.message}</p>
                )}
                {msg.file && (
                  <a
                    href={msg.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:underline text-sm flex items-center mt-1"
                  >
                    <Paperclip size={14} className="mr-1" />
                    فتح الملف
                  </a>
                )}
              </div>

              {isTeacher && (
                <button
                  onClick={() => handleUnpin(msg.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full"
                  title="Unpin Message"
                >
                  <X size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Teacher input */}
      <div className="mt-6">
        <TeacherChatInput
          groupId={groupId}
          isTeacher={isTeacher}
          refresh={handleRefresh}
        />
      </div>

      {/* View full chat button */}
      <div className="mt-6 text-center">
        <button
          onClick={handleViewChat}
          className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
        >
          افتح الشات
        </button>
      </div>
    </div>  );
};

export default PinnedMessages;
