import React, { useState } from 'react';
import axiosClientInstance from '../../../lib/axiosInstance';

interface ConfirmationPageProps {
  teacherId: string;
  planId: number;
  onConfirm: (id: any) => void;
  onClose: () => void;
}

const ConfirmationPage: React.FC<ConfirmationPageProps> = ({
  teacherId,
  planId,
  onConfirm,
  onClose,
}) => {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleConfirmSubscription = async () => {
    setShowSuccess(true);
    setTimeout(async () => {
      try {
        const response = await axiosClientInstance.post('/subscriptions/subscriptions/', {
          teacher_id: teacherId,
          plan_id: planId,
        });
        if (response.data) {
          onConfirm(response.data.id);
        }
      } catch (error) {
        console.error('Subscription failed:', error);
      }
      setShowSuccess(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full transform transition-all duration-300 scale-100 hover:scale-105">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            لقد قمت بالتسجيل لمتابعة دروس الاستاذ
          </h2>

          {/* Success Animation */}
          {showSuccess && (
            <div className="my-6">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4 w-full mt-6">
            <button
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleConfirmSubscription}
              disabled={showSuccess}
            >
              تأكيد التسجيل
            </button>
            <button
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold text-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onClose}
              
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;