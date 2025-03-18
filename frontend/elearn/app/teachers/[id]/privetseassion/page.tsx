"use client"
import { useState } from 'react';
import { useParams } from 'next/navigation';
import axiosClientInstance from '../../../lib/axiosInstance';

const CreatePrivateSessionRequest = () => {
  const params = useParams();
  const teacher_id  = params.id; // Get teacher_id from the URL

  const [studentNotes, setStudentNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teacher_id || !studentNotes.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await axiosClientInstance.post('/privet/session-requests/create/', {
        teacher_id: teacher_id,
        student_notes: studentNotes,
      });

      if (response.status === 201) {
        setSuccess(true);
        setStudentNotes('');
      }
    } catch (err) {
      console.log(err);
      
      setError('An error occurred while submitting the request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-light flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Request Private Session</h1>

        {success && (
          <div className="bg-green-200 border border-green-400 text-green-800 px-4 py-3 rounded mb-4">
            Your request has been submitted successfully!
          </div>
        )}

        {error && (
          <div className="bg-red-300 border border-red-500 text-red-800 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="studentNotes" className="block text-sm font-medium text-gray-700">
              Notes for the Teacher
            </label>
            <textarea
              id="studentNotes"
              value={studentNotes}
              onChange={(e) => setStudentNotes(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple focus:border-purple sm:text-sm"
              rows={4}
              placeholder="Enter your notes here..."
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-purple text-white px-4 py-2 rounded-md hover:bg-purple focus:outline-none focus:ring-2 focus:ring-purple focus:ring-offset-2"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePrivateSessionRequest;