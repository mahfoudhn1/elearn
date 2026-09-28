import { useState } from 'react';
import axiosClientInstance from '../../../lib/axiosInstance';

interface TeacherChatInputProps {
  groupId: string;
  isTeacher: boolean; // Prop to indicate if the user is the teacher
  refresh :()=> void
}

import { Send, Paperclip } from 'lucide-react';

interface TeacherChatInputProps {
  groupId: string;
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
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-gray-200 pt-4">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type an announcement..."
        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
        rows={3}
      />
      <div className="flex items-center justify-between">
        <label className="cursor-pointer">
          <input type="file" onChange={handleFileChange} className="hidden" />
          <div className="flex items-center text-sm text-gray-600 hover:text-orange-600 transition-colors">
            <Paperclip size={16} className="mr-2" />
            <span>{file ? file.name : 'Attach File'}</span>
          </div>
        </label>
        <button
          type="submit"
          disabled={loading || (!message.trim() && !file)}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-gray-400 transition-colors"
        >
          {loading ? 'Sending...' : <Send size={16} />}
        </button>
      </div>
    </form>
  );
};

export default TeacherChatInput;