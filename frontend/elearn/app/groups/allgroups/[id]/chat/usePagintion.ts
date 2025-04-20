import { useEffect, useState, useRef } from 'react';
import axiosClientInstance from '../../../../lib/axiosInstance';
import { User } from '../../../../types/student';

interface Message {
  id: string;
  sender: User;
  message?: string;
  file?: string;
  fileUrl?: string;
  is_pinned: boolean;
  created: string;
}

export const usePaginatedMessages = (groupId: string) => {
  const [pagemessages, setPagemessages] = useState<Message[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hasFetchedInitial = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchMessages = async (cursor?: string) => {
    setLoading(true);
    try {
      const res = await axiosClientInstance.get('/chat/', {
        params: {
          group_id: groupId,
          cursor: cursor || undefined,
        },
      });

      const newMessages = res.data.results.paginated_messages ;
      setPagemessages(prev => cursor ? [...prev, ...newMessages] : newMessages);
      setPinnedMessages(res.data.results.pinned_messages)
      setNextCursor(res.data.next ? new URL(res.data.next).searchParams.get('cursor') : null);
    } catch (err) {
      console.error('Pagination error', err);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setPagemessages([]);
    setNextCursor(null);
    await fetchMessages();
  };

  useEffect(() => {
    if (!hasFetchedInitial.current) {
      hasFetchedInitial.current = true;
      fetchMessages();
    }

    // WebSocket setup
    const WEBSOCKET_URL = `ws://localhost:8000/ws/chat/${groupId}/`;
    wsRef.current = new WebSocket(WEBSOCKET_URL);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPagemessages(prev => {
        // Check if message already exists
        if (!prev.some(msg => msg.id === data.id)) {
          return [data, ...prev];
        }
        return prev;
      });
    };

    return () => {
      wsRef.current?.close();
    };
  }, [groupId]);

  const loadMore = () => {
    if (nextCursor && !loading) {
      fetchMessages(nextCursor);
    }
  };
  
  return {
    pagemessages,
    pinnedMessages,
    loadMore,
    hasMore: !!nextCursor,
    loading,
    refresh,
  };
};