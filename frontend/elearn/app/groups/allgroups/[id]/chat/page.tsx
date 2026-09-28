'use client';

import { useState, useEffect, useRef } from 'react';
import MessageInput from './MessageInput';
import MessageList from './MessageList';
import { User } from '../../../../types/student';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store/store';
import { usePaginatedMessages } from './usePagintion';
import { useParams } from 'next/navigation';

interface Message {
  id: string;
  sender: User;
  message?: string;
  file?:string;
  fileUrl?: string; // Changed from file to fileUrl
  is_pinned: boolean;
  created: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = useSelector((state: RootState) => state.auth.user);
  const IS_TEACHER = user?.role === 'teacher';
  const params = useParams()
  const groupId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { pagemessages,pinnedMessages, loadMore, hasMore,refresh } = usePaginatedMessages(groupId);

  const WEBSOCKET_URL = `wss://riffaa.com/riffaa/ws/chat/${params.id}/`;

  
 

  useEffect(() => {
    
    wsRef.current = new WebSocket(WEBSOCKET_URL);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chat_delete') {
        // setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
        refresh(); 
      } else {
      const newMessage: Message = {
        id: data.id,                // use DB id from server
        sender: data.sender,        // already comes from server
        message: data.message,
        file: data.file || undefined,
        fileUrl: data.fileUrl || undefined,
        is_pinned: data.is_pinned ?? false,
        created: data.created,      // use DB timestamp
      };
      setMessages((prev) => {
        const exists = prev.some((msg) => msg.id === newMessage.id);
        if (!exists) {
          return [...prev, newMessage];
        }
        return prev;
      });}
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      wsRef.current?.close();
    };
  
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (message: string, fileUrl?: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          message,
          fileUrl, 
        })
      );
    }
  };
  const handleDelete = async (messageId: string) => {
    const isConfirmed = window.confirm("متأكد من حذف الرسالة !");
    
    if (!isConfirmed) return; 
  
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'delete',
            messageId: messageId,
          })
        );
      }
      refresh();
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message');
    }
  };
  const combinedMessages = [...pagemessages, ...messages].sort(
    (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
  );
  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-50 to-gray-200">
      <main className="flex-1 md:w-[95%] w-full md:mr-[5%] mr-0 overflow-y-auto">
        <MessageList
          messages={combinedMessages}
          PinnedMessage={pinnedMessages ||[]}
          isTeacher={IS_TEACHER}
          refresh={refresh}
          OnDelete = {handleDelete}
        />
        <div ref={messagesEndRef} />
      </main>
      <footer className="bg-white border-t border-gray-200 p-4 sticky bottom-0 z-10">
        <div className="max-w-3xl mx-auto">
          <MessageInput sendMessage={sendMessage} />
        </div>
      </footer>
    </div>
  );
}