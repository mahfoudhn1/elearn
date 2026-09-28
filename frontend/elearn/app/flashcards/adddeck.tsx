import React, { useState } from "react";
import { Earth, Lock } from "lucide-react";
import subjects from "../../public/data/subjects.json";

interface AddDeckProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newDeck: {
    title: string;
    description: string;
    subject: string;
    visibility: string;
  }) => void;
}

function AddDeck({ isOpen, onClose, onSubmit }: AddDeckProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState<string>("");
  const [visibility, setVisibility] = useState("private");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && description.trim() && visibility.trim()) {
      onSubmit({ title, description, subject, visibility });
      setTitle("");
      setDescription("");
      setSubject("");
      setVisibility("private");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full p-6 animate-[fadeIn_0.2s_ease-out]">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          انشاء مجموعة جديدة
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عنوان المجموعة
            </label>
            <input
              type="text"
              placeholder="ادخل عنوان"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              وصف
            </label>
            <textarea
              placeholder="ادخل وصف قصير..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
              rows={3}
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              المادة
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
            >
              <option value="" disabled>
                اختر المادة
              </option>
              {subjects.map((subj) => (
                <option key={subj.value} value={subj.value}>
                  {subj.label}
                </option>
              ))}
            </select>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الخصوصية
            </label>
            <div className="flex flex-col gap-2">
              {/* Private */}
              <label className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={visibility === "private"}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="w-4 h-4 text-orange-600 focus:ring-orange-600"
                />
                <Lock className="text-gray-500 w-5 h-5" />
                <span className="text-gray-800">خاصة</span>
              </label>

              {/* Public */}
              <label className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={visibility === "public"}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="w-4 h-4 text-orange-600 focus:ring-orange-600"
                />
                <Earth className="text-gray-500 w-5 h-5" />
                <span className="text-gray-800">عامة</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddDeck;
