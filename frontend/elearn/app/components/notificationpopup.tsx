"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface NotificationProps {
    message: string;
    onClose: () => void;
}

const NotificationPopup: React.FC<NotificationProps> = ({ message, onClose }) => {
    const router = useRouter()
    const handleNotif = ()=>{
        router.push('/notifications')
    }
    return (
        <div className="fixed right-0 transform  bg-gradient-to-r from-purple to-blue-500 text-white p-4 rounded-r-lg shadow-2xl animate-slide-in">
            <div className="flex items-center cursor-pointer"
            onClick={handleNotif}>
                <span className="mr-2">🎉</span> 
                <span>{message}</span>
            </div>
        </div>
    );
};

export default NotificationPopup;