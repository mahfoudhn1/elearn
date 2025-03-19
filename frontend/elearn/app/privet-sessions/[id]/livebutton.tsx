"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";

export default function StartNowButton({ proposedDate }: { proposedDate: string }) {
  const [showButton, setShowButton] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState(null); // Not used yet, keeping it for future use
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    // Parse the proposed date (assumes it's in UTC, as it ends with 'Z')
    const proposed = new Date(proposedDate);
    const timeWindow = 10 * 60 * 1000; // 10 minutes in milliseconds

    // Function to check if current time is within the window
    const checkTime = () => {
      const now = new Date(); // Current time in UTC
      const timeDiff = Math.abs(proposed.getTime() - now.getTime()); // Absolute difference in milliseconds
      const isAlmostTime = timeDiff <= timeWindow; // Within 10 minutes
      setShowButton(isAlmostTime);
    };

    // Check immediately
    checkTime();

    // Set up an interval to check every second (or adjust as needed)
    const interval = setInterval(checkTime, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [proposedDate]);

  // Only render the button if showButton is true
  if (!showButton) return null;

  return (
    <div className="bottom-4 right-4 animate-pulse">
      <button
        className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 transition-all"
      >
        {user?.role !== "student" ? (
          <>
            <span className="w-3 h-3 bg-white rounded-full" />
            ابدأ البث
          </>
        ) : (
          <>
            <span className="w-3 h-3 bg-blue-500 rounded-full" />
            ادخل البث
          </>
        )}
      </button>
    </div>
  );
}