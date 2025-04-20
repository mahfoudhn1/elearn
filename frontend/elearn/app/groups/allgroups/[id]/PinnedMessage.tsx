"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axiosClientInstance from '../../../lib/axiosInstance';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store/store';
import TeacherChatInput from './TeacherChatInput';

interface ChatMessage {
  id: number;
  sender: { username: string };
  sender_name: string;
  message: string | null;
  file: string | null;
  is_pinned: boolean;
  created: string;
}

interface PinnedMessagesProps {
  groupId: number;
}

const PinnedMessages: React.FC<PinnedMessagesProps> = ({ groupId }) => {
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
    const user = useSelector((state:RootState)=>state.auth.user) 
    const isTeacher = user?.role === 'teacher'

    const fetchPinnedMessages = async () => {
      try {
        const response = await axiosClientInstance.get(`/chat/`,{
            params:{
                group_id:groupId
            }
        });
        
        const pinned = response.data.results.pinned_messages
        setPinnedMessages(pinned);
      } catch (error) {
        console.error('Error fetching pinned messages:', error);
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
  const handleUnpin = async (messageId: number) => {
    try {
      await axiosClientInstance.patch(`/chat/${messageId}/`, { is_pinned: false });
      setPinnedMessages(pinnedMessages.filter((msg) => msg.id !== messageId));
    } catch (error) {
      console.error('Error unpinning message:', error);
      alert('Failed to unpin message. Please try again.');
    }
  };
  return (
    <div className="bg-white rounded-lg shadow-md p-4 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-3 text-gray-800">رسائل مثبته</h2>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : pinnedMessages.length === 0 ? (
        <p className="text-gray-500">لا رسائل مثبته</p>
      ) : (
        <ul className="space-y-3">
           {pinnedMessages.map((msg) => (
            <li key={msg.id} className="border-b pb-2 flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{msg.sender_name}</span> -{' '}
                  {new Date(msg.created).toLocaleDateString()}
                </p>
                {msg.message && <p className="text-gray-800">{msg.message}</p>}
                {msg.file && (
                  <a
                    href={msg.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    افتح الملف
                  </a>
                )}
              </div>
              {isTeacher && (
                <button
                  onClick={() => handleUnpin(msg.id)}
                  className="text-red-500 hover:text-red-800 text-sm"
                >
                  Unpin
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div>
      <TeacherChatInput groupId={groupId} isTeacher ={isTeacher}  refresh={handleRefresh}/>
      </div>
      <button
        onClick={handleViewChat}
        className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
      >
        افتح الشات كامل
      </button>
    </div>
  );
};

export default PinnedMessages;