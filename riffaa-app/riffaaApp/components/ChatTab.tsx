import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  View,
} from 'react-native';

import { AppText, EmptyState, IconButton, Row } from './ui';
import { useBottomInset } from '../hooks/useBottomInset';
import { useDirection } from '../hooks/useDirection';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { createChatMessage } from '../services/api/chat';
import { formatTime } from '../utils/format';

interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  time: string;
  isMe: boolean;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function toMessage(raw: Record<string, unknown>, fallbackUser: string, fallbackNow: string): ChatMessage {
  const created = readString(raw.created_at) || readString(raw.created);
  const date = created ? new Date(created) : null;
  return {
    id: readString(raw.id) || String(Math.random()),
    senderName:
      readString(raw.sender_name) ||
      readString((raw.sender as Record<string, unknown> | undefined)?.username) ||
      fallbackUser,
    text: readString(raw.message) || readString(raw.text) || readString(raw.content),
    time: date && !Number.isNaN(date.getTime()) ? formatTime(date) : fallbackNow,
    isMe: raw.is_me === true,
  };
}

export default function ChatTab({
  groupId,
  initialMessages = [],
}: {
  groupId: string | number;
  initialMessages?: Record<string, unknown>[];
}) {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const bottomInset = useBottomInset();

  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialMessages.map((raw) => toMessage(raw, t('userFallback'), t('now'))),
  );
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (messages.length === 0) return;
    const id = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(id);
  }, [messages]);

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text) return;
    setMessageText('');
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      senderName: t('userFallback'),
      text,
      time: t('now'),
      isMe: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      await createChatMessage({ group: Number(groupId), message: text, is_pinned: false });
    } catch {
      // Keep the optimistic bubble; the next fetch reconciles it.
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 16, gap: 12, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        windowSize={9}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ item }) => {
          const own = item.isMe;
          return (
            <Row
              justify={own ? 'flex-end' : 'flex-start'}
              className="px-4"
            >
              <View
                className={`max-w-[78%] rounded-3xl px-4 py-3 ${
                  own ? 'bg-brand' : 'bg-surface-2 border border-hairline'
                }`}
                style={own ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 }}
              >
                {!own ? (
                  <AppText variant="caption" weight="semibold" tone="brand" className="mb-1">
                    {item.senderName}
                  </AppText>
                ) : null}
                <AppText variant="bodySm" className={own ? 'text-on-brand' : 'text-ink'}>
                  {item.text}
                </AppText>
                <AppText
                  variant="caption"
                  className={`mt-1 ${own ? 'text-on-brand opacity-70' : 'text-ink-subtle'}`}
                >
                  {item.time}
                </AppText>
              </View>
            </Row>
          );
        }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center">
            <EmptyState icon="chatbubbles-outline" title={t('chatEmpty')} />
          </View>
        }
      />

      <Row
        gap={8}
        align="center"
        className="border-t border-hairline bg-surface px-3 py-3"
        style={{ paddingBottom: bottomInset }}
      >
        <View className="flex-1">
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder={t('chatPlaceholder')}
            placeholderTextColor={tokens.inkSubtle}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => void handleSend()}
            className="max-h-28 min-h-[48px] rounded-3xl border border-hairline bg-surface-2 px-4 py-3 text-base text-ink"
            style={{
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr',
            }}
          />
        </View>

        <IconButton
          icon="send"
          accessibilityLabel={t('send')}
          variant="brand"
          onPress={() => void handleSend()}
        />
      </Row>
    </KeyboardAvoidingView>
  );
}
