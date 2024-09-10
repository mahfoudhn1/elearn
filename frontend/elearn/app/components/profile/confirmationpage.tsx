import React from 'react';
import axiosClientInstance from '../../lib/axiosInstance';





interface ConfirmationPageProps {
  teacherId: string;
  planId: number;
  onConfirm: () => void;
}

const ConfirmationPage: React.FC<ConfirmationPageProps> = ({
    teacherId,
    planId,

  onConfirm,
}) => {
  const handleConfirmSubscription = async () => {
    try {
      const response = await axiosClientInstance.post('/subscriptions/', {
        teacher: teacherId,
        plan: planId,
      });
      console.log('Subscription successful:', response.data);
      onConfirm();
    } catch (error) {
      console.error('Subscription failed:', error);
    }
  };

  return (
    <div className="confirmation-page">
      <h2>Confirm Your Subscription</h2>
      <p><strong>Teacher:</strong> {teacherId}</p>
      <p><strong>Plan ID:</strong> {planId}</p>
      <button
        className="confirm-button"
        onClick={handleConfirmSubscription}
      >
        Confirm Subscription
      </button>
    </div>
  );
};

export default ConfirmationPage;
