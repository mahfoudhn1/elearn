"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Interfaces
interface Message {
  id: number;
  sender: { username: string };
  content: string;
  file: string | null;
  is_pinned: boolean;
  created: string;
}

interface ChatProps {
  groupId: string;
  authToken: string;
}

// MessageItem Component
const MessageItem: React.FC<{
  message: Message;
  authToken: string;
  onPinToggle: (message: Message) => void;
}> = ({ message, authToken, onPinToggle }) => {
  return (
    <div
      className={`mb-4 p-3 rounded-lg ${
        message.is_pinned ? 'bg-yellow-200 border-2 border-yellow-400' : 'bg-white'
      }`}
    >
      <div className="flex justify-between">
        <strong>{message.sender.username}</strong>
        <span className="text-gray-500 text-sm">
          {new Date(message.created).toLocaleTimeString()}
        </span>
      </div>
      <p>{message.content}</p>
      {message.file && (
        <a
          href={message.file}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
        >
          View File
        </a>
      )}
      <button
        onClick={() => onPinToggle(message)}
        className="text-sm text-blue-500"
      >
        {message.is_pinned ? 'Unpin' : 'Pin'}
      </button>
    </div>
  );
};

export default MessageItem