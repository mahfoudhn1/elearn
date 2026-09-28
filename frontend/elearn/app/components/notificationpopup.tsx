import React from "react";
import { useRouter } from "next/navigation";
import { X, Bell } from "lucide-react";

interface NotificationProps {
  message: string;
  onClose: () => void;
}

const NotificationPopup: React.FC<NotificationProps> = ({ message, onClose }) => {
  const router = useRouter();

  const handleNotifClick = () => {
    router.push("/notifications");
    onClose();
  };

  return (
    <div className="fixed top-6 right-6 max-w-sm bg-grey-900 text-white rounded-xl shadow-lg border border-gray-800 transition-transform transform translate-x-0 animate-slide-in">
      <div className="flex items-start p-4">
        
        {/* Icon */}
        <div
          className="flex-shrink-0 bg-orange-600 rounded-full w-10 h-10 flex items-center justify-center shadow-md cursor-pointer"
          onClick={handleNotifClick}
        >
          <Bell size={20} className="text-white" />
        </div>

        {/* Message */}
        <div
          className="ml-3 flex-1 cursor-pointer hover:text-orange-600 transition"
          onClick={handleNotifClick}
        >
          {message}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="ml-3 text-gray-400 hover:text-gray-200 transition"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default NotificationPopup;
