import { FC, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { User } from '../../../../types/student';
import { RootState } from '../../../../../store/store';
import axiosClientInstance from '../../../../lib/axiosInstance';
import { usePaginatedMessages } from './usePagintion';

interface Message {
  id: string;
  sender: User;
  message?: string;
  file?: string;
  is_pinned: boolean;
  created: string;
}

interface MessageListProps {
  messages: Message[];
  PinnedMessage:Message[];
  isTeacher: boolean;
  refresh: () => void;
  OnDelete:(messageId: string)=> void;
}

const MessageList: FC<MessageListProps> = ({ messages, isTeacher, refresh, OnDelete, PinnedMessage }) => {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const regularMessages = (Array.isArray(messages) ? messages : []).filter(msg => !msg.is_pinned);
  
  const { loadMore, hasMore } = usePaginatedMessages('1');

  const sortedRegularMessages = [...regularMessages].sort((a, b) =>
    new Date(a.created).getTime() - new Date(b.created).getTime()
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop } = scrollRef.current;
      if (scrollTop === 0 && hasMore) {
        loadMore();
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const PinMessage = async (messageId: string, isPinned: boolean) => {
    try {
      await axiosClientInstance.patch(`/chat/${messageId}/`, { is_pinned: isPinned });
      refresh();
    } catch (err) {
      console.error('Failed to pin message:', err);
    }
  };

  const formatTime = (created: string) =>
    new Date(created).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const MessageItem = ({ msg, isCurrentUser }: { msg: Message; isCurrentUser: boolean }) => (
    <div className={`flex ${isCurrentUser ? 'justify-start' : 'justify-end'} mb-3`}>
      <div
        className={[
          'relative max-w-[75%] p-3 rounded-lg shadow-sm',
          msg.is_pinned
            ? 'bg-grey-50 border-l-4 border-gray-400'
            : isCurrentUser
            ? 'bg-gray-dark text-white'
            : 'bg-white text-gray-dark',
          !isCurrentUser ? 'rounded-bl-none' : 'rounded-br-none',
        ].join(' ')}
      >
        {msg.is_pinned && (
          <span className="absolute -top-2 -left-2 bg-gray-400 text-white text-xs px-2 py-0.5 rounded-full">
            مثبت
          </span>
        )}

        <div className="flex justify-between items-baseline mb-1">
          <span className="font-medium mx-2 text-sm">
            {msg.sender.first_name} {msg.sender.last_name}
          </span>
          <span className={`text-xs ml-2 ${isCurrentUser ? 'text-white' : 'text-gray-500'}`}>
            {formatTime(msg.created)}
          </span>
        </div>
        <div>
        {msg.message && <p className="text-sm break-words">{msg.message}</p>}

        {msg.file && (
          <a
            href={msg.file}
            className={`mt-2 flex items-center text-sm ${isCurrentUser ? 'text-white' : 'text-blue-600'}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileIcon className="w-4 h-4 mr-1" />
            تحميل الملف
          </a>
        )}
        </div>
        {(isCurrentUser || isTeacher) && (
          <button
            onClick={()=>OnDelete(msg.id)}
            className="absolute -bottom-2 -left-2 text-gray-dark bg-white p-1 rounded-full shadow hover:bg-gray-200"
            title="Delete message"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}

        {isTeacher && (
          <button
            onClick={() => PinMessage(msg.id, !msg.is_pinned)}
            className="absolute -bottom-2 -right-2 text-gray bg-white p-1 rounded-full shadow hover:bg-gray-200"
            title={msg.is_pinned ? 'Unpin message' : 'Pin message'}
          >
            <PinIcon isPinned={msg.is_pinned} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div  className="flex md:flex-row flex-col h-full bg-gray-50">
      {PinnedMessage.length > 0 && (
        <div className="w-72 border-r border-gray-200 bg-white p-4 overflow-y-auto">
          <h3 className="font-semibold text-gray-500 mb-3 sticky top-0 bg-white py-2">
            الرسائل المثبته ({PinnedMessage.length})
          </h3>
          <div className="space-y-3">
            {PinnedMessage.map(msg => (
              <MessageItem key={msg.id} msg={msg} isCurrentUser={currentUser?.id === msg.sender.id} />
            ))}
          </div>
        </div>
      )}

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 border border-gray">
        <div className="max-w-2xl mx-auto w-full space-y-2">
          {sortedRegularMessages.map(msg => (
            <MessageItem key={msg.id} msg={msg} isCurrentUser={currentUser?.id === msg.sender.id} />
          ))}
          {/* 👇 Scroll target */}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
};

const FileIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const PinIcon = ({ isPinned }: { isPinned: boolean }) => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {isPinned ? (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v12" />
      </>
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11l-7-7-7 7" />
    )}
  </svg>
);
const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export default MessageList;
