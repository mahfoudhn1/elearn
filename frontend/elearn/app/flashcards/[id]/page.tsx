'use client';
import React, { useEffect, useState } from 'react';
import { Deck, Flashcard } from '../../types/student';
import axiosClientInstance from '../../lib/axiosInstance';
import { useParams } from 'next/navigation';
import { Edit2, Play, Plus, MoreVertical, Trash2 } from 'lucide-react';
import AddFlashCard from './addFlashCard';
import StartLearning from './StartLearning';

function SingleDeck() {
  const [deck, setDeck] = useState<Deck>();
  const [visibleMenuId, setVisibleMenuId] = useState<string | null>(null);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [editCard, setEditCard] = useState<Flashcard | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  const params = useParams();

  useEffect(() => {
    const fetchSingleDeck = async () => {
      try {
        const response = await axiosClientInstance.get(
          `/flashcards/decks/${params.id}/`
        );
        if (response.data) {
          setDeck(response.data);
        }
      } catch (error) {
        console.log(error);
      }
    };
    fetchSingleDeck();
  }, []);

  const handleMenuToggle = (cardId: string) => {
    setVisibleMenuId(visibleMenuId === cardId ? null : cardId);
  };

  const handleCreateFlashCard = async (newFlashcard: { front: string; back: string }) => {
    try {
      if (editCard) {
        const response = await axiosClientInstance.put(
          `/flashcards/${editCard.id}/`,
          { ...newFlashcard, deck: params.id }
        );
        setDeck((prev: any) => ({
          ...prev,
          flashcards: prev.flashcards.map((card: any) =>
            card.id === editCard.id ? response.data : card
          ),
        }));
      } else {
        const response = await axiosClientInstance.post('/flashcards/', {
          ...newFlashcard,
          deck: params.id,
        });
        setDeck((prev: any) => ({
          ...prev,
          flashcards: [...(prev?.flashcards || []), response.data],
        }));
      }
      setIsModelOpen(false);
      setEditCard(null);
    } catch (error) {
      console.error('Error creating/updating flashcard:', error);
    }
  };

  const handleDelete = async (cardId: string) => {
    await axiosClientInstance.delete(`/flashcards/${cardId}/`);
    setDeck((prev: any) => ({
      ...prev,
      flashcards: prev.flashcards.filter((card: any) => card.id !== cardId),
    }));
    setVisibleMenuId(null);
  };

  return (
    <div className="min-h-screen md:mr-6 bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{deck?.title}</h1>
            <p className="text-gray-600 mt-1">{deck?.description}</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button
              onClick={() => {
                setIsModelOpen(true);
                setEditCard(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 font-medium hover:bg-gray-100 transition"
            >
              <Plus className="w-4 h-4" />
              اضافة بطاقة
            </button>

            <button
              onClick={() => setIsStarted(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            >
              <Play className="w-4 h-4" />
              أبدأ المراجعة
            </button>
          </div>
        </div>

        {/* Flashcards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {deck?.flashcards.map((card) => (
            <div
              key={card.id}
              className="bg-white/95 backdrop-blur-sm rounded-xl shadow-md hover:shadow-lg transition p-5 relative"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-gray-900">{card.front}</h3>
                <div className="relative">
                  <button
                    onClick={() => handleMenuToggle(card.id)}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-500" />
                  </button>
                  {visibleMenuId === card.id && (
                    <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <button
                        onClick={() => handleDelete(card.id)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50 w-full"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-gray-600 text-sm mt-3">{card.back}</p>

              <div className="flex justify-between items-center mt-4 text-xs text-gray-400">
                <span>
                  {new Date(card.created_at).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <button
                  onClick={() => {
                    setIsModelOpen(true);
                    setEditCard(card);
                  }}
                  className="p-1 rounded bg-gray-800 text-white hover:bg-gray-700"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {isModelOpen && (
        <AddFlashCard
          isOpen={true}
          onClose={() => setIsModelOpen(false)}
          onSubmit={handleCreateFlashCard}
          card={editCard}
        />
      )}

      {isStarted && (
        <StartLearning
          isOpen={true}
          onClose={() => setIsStarted(false)}
          flashcards={deck?.flashcards}
          DeckProgress={deck?.progress}
        />
      )}
    </div>
  );
}

export default SingleDeck;
