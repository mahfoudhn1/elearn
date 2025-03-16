import React from 'react';
import axiosClientInstance from '../../../lib/axiosInstance';

interface ConfirmationPageProps {
  teacherId: string;
  planId: number;
  onConfirm: () => void;
  onclose:()=>void
}

const ConfirmationPage: React.FC<ConfirmationPageProps> = ({
    teacherId,
    planId,
  onConfirm,
  onclose
}) => {
  const handleConfirmSubscription = async () => {
    try {
      const response = await axiosClientInstance.post('/subscriptions/', {
        teacher_id: teacherId,
        plan: planId,
      });
      if(response.data){
      }
      onConfirm();

    } catch (error) {
      console.error('Subscription failed:', error);
    }
  };

  return (
    
    <div className="absolute bg-white shadow-lg rounded-lg top-1/2 left-1/2 -translate-x-1/2">
      <div className='relative flex flex-col p-8 mx-auto my-auto'>
      <div>
      <h2>لقد قمت بالتسجيل لمتابعة دروس الاستاذ</h2>
      </div>
      <div className='flex mt-4'>
      <button
          className="px-4 py-2 ml-4 bg-blue-400 hover:bg-blue-500 text-white rounded "
          onClick={handleConfirmSubscription}
        >
          تأكيد التسجيل 
        </button>

        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded"
          onClick={onclose}
        >
          الغاء 
        </button>
      </div>

      </div>
      
    </div>
  );
};

export default ConfirmationPage;
