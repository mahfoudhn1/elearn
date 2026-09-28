import React, { useState, useEffect } from "react";

interface AddFlashCardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newFlashcard: { front: string; back: string }) => void;
  card?: { front: string; back: string } | null;
}

function AddFlashCard({ isOpen, onClose, onSubmit, card }: AddFlashCardProps) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  useEffect(() => {
    setFront(card?.front || "");
    setBack(card?.back || "");
  }, [card]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (front.trim() && back.trim()) {
      onSubmit({ front, back });
      setFront("");
      setBack("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full p-6 animate-[fadeIn_0.2s_ease-out]">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {card ? "تعديل البطاقة" : "إنشاء بطاقة جديدة"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Front side */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              وجه البطاقة
            </label>
            <input
              type="text"
              placeholder="ادخل السؤال..."
              value={front}
              onChange={(e) => setFront(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
            />
          </div>

          {/* Back side */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ظهر البطاقة (الإجابة)
            </label>
            <textarea
              placeholder="ادخل الإجابة..."
              value={back}
              onChange={(e) => setBack(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            >
              {card ? "حفظ" : "إنشاء"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddFlashCard;
