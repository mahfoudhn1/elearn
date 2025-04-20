import { useState } from 'react';
import axiosClientInstance from '../../../lib/axiosInstance';

interface TeacherChatInputProps {
  groupId: number;
  isTeacher: boolean; // Prop to indicate if the user is the teacher
  refresh :()=> void
}

const TeacherChatInput: React.FC<TeacherChatInputProps> = ({ groupId, isTeacher, refresh }) => {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('group', groupId.toString());
      formData.append('message', message);
      formData.append('is_pinned', 'true'); // Auto-pin the message
      if (file) {
        formData.append('file', file);
      }

      await axiosClientInstance.post('/chat/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMessage('');
      setFile(null);
      refresh()
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  if (!isTeacher) {
    return null; 
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 max-w-md mx-auto mt-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">اعلان الاستاذ</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="أكتب اعلان ... "
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
        />
        <input
          type="file"
          onChange={handleFileChange}
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <button
          type="submit"
          disabled={loading || (!message.trim() && !file)}
          className="w-full bg-gray-600 text-white py-2 rounded-md hover:bg-green-700 transition disabled:bg-gray-400"
        >
          {loading ? 'ارسال...' : 'ارسال (تثبيت )'}
        </button>
      </form>
    </div>
  );
};

export default TeacherChatInput;