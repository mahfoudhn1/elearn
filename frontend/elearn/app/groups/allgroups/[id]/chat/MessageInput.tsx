import { FC, useState, ChangeEvent, useRef, useEffect } from 'react';
import axiosClientInstance from '../../../../lib/axiosInstance';
import { useParams } from 'next/navigation';

interface MessageInputProps {
  sendMessage: (message: string, fileUrl?: string) => void; // Updated to accept fileUrl
}

const MessageInput: FC<MessageInputProps> = ({ sendMessage }) => {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false); // Track upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const params = useParams()
  useEffect(() => {
    const handleFocus = () => {
      if (window.innerWidth < 768 && inputRef.current) {
        setTimeout(() => {
          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    const textarea = inputRef.current;
    textarea?.addEventListener('focus', handleFocus);

    return () => {
      textarea?.removeEventListener('focus', handleFocus);
    };
  }, []);


  // Upload file to /chat/ endpoint
  const uploadFile = async (upfile: File): Promise<string> => {
    const groupId = params.id
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', upfile);
      formData.append('group', groupId.toString());
      formData.append('message', "");
      formData.append('is_pinned', 'false'); 
      const response = await axiosClientInstance.post('/chat/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!response.data) throw new Error('File upload failed');
      const { file } = await response.data; 
      return file;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
      if (file) {
        try {
          const fileUrl = await uploadFile(file);
          // Refresh the page after successful file upload
          window.location.reload();
          return; // Exit early since we're refreshing
        } catch (error) {
          console.error('Upload error:', error);
          alert('Failed to upload file. Please try again.');
          return;
        }
      }
  
    // Handle text message if there's one
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
    }
  
    // Reset file input regardless
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 bg-gray-50 border-t border-gray-200 shadow-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              rows={1}
              className="w-full p-3 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all duration-200"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              aria-label="Message input"
              disabled={isUploading}
            />
            <label
              htmlFor="file-upload"
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 hover:bg-gray-100 rounded-full"
              aria-label="Attach file"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828l6.586-6.586a4 4 0 00-5.656-5.656l-6.586 6.586a6 6 0 008.485 8.485l6.586-6.586"
                />
              </svg>
              <input
                id="file-upload"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                aria-label="File upload"
                disabled={isUploading}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={(!message.trim() && !file) || isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
            aria-label="Send message"
          >
            {isUploading ? 'Uploading...' : 'Send'}
          </button>
        </div>
        {file && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 p-2 rounded-lg">
            <span className="truncate max-w-[200px]">{file.name}</span>
            <button
              type="button"
              onClick={removeFile}
              className="text-red-500 hover:text-red-700"
              aria-label="Remove file"
              disabled={isUploading}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default MessageInput;
