import React, { useEffect, useState } from 'react';
import { Ticket, ChevronRight, Check, X } from 'lucide-react';
import { Flashcard, Progress } from '../../types/student'
import axiosClientInstance from '../../lib/axiosInstance';

const styles = `
  .preserve-3d { transform-style: preserve-3d; }
  .perspective { perspective: 1000px; }
  .backface-hidden { backface-visibility: hidden; }
  .rotate-y-180 { transform: rotateY(180deg); }
`;

interface StartLearning {
  isOpen: boolean;
  onClose: () => void;
  flashcards?: Flashcard[] | null;
  DeckProgress? : Progress[] | null
}

const StartLearning = ({
  isOpen,
  onClose,
  flashcards,
  DeckProgress
}: StartLearning) => {
  const [cards, setCards] = useState(() =>
    flashcards?.map((flashcard, index) => ({
      ...flashcard,
      isFlipped: false,
      offset: index * -4,
      position: 'center',
    })) || []
  );

  const [progress, setProgress] = useState({
    current: 0,
    total: flashcards?.length || 0,
    correct: 0,
    incorrect: 0
  });

  useEffect(() => {
    if (flashcards) {
      setCards(
        flashcards.map((flashcard, index) => ({
          ...flashcard,
          isFlipped: false,
          offset: index * -4,
          position: 'center',
        }))
      );
      setProgress({
        current: 0,
        total: flashcards.length,
        correct: 0,
        incorrect: 0
      });
      console.log(DeckProgress);
      
    }
  }, [flashcards]);

  const handleFlip = (id: number) => {
    setCards(cards.map(card =>
      card.id === id ? { ...card, isFlipped: !card.isFlipped } : card
    ));
  };

  const handleUpdate = async(totalAnswers:any)=>{
    try{
      const res = await axiosClientInstance.put(`/flashcards/progress/${DeckProgress?.[0]?.id}/update_progress/`, totalAnswers)
      if(res.data){
        setTimeout(onClose, 300);
      }
    }
    catch(error){
      console.log(error);
    }
  }

  const handleSwipe = (direction: 'left' | 'right') => {
    const newCards = [...cards];
    const topCard = newCards[0];
    

    setProgress(prev => {
      const newProgress = {
        ...prev,
        current: prev.current + 1,
        correct: direction === 'left' ? prev.correct + 1 : prev.correct,
        incorrect: direction === 'right' ? prev.incorrect + 1 : prev.incorrect
      };
      
      if (newProgress.current === prev.total) {
        const totalAnswers = {
          correct_total: newProgress.correct,
          wrong_total: newProgress.incorrect
        };
        handleUpdate(totalAnswers)
        
      }
      
      return newProgress;
    });
    

    setCards(cards.map((card, index) =>
      index === 0 ? { ...card, position: direction } : card
    ));


    setTimeout(() => {
      setCards(cards.slice(1));
    }, 300);
  };

  const progressPercentage = (progress.current / progress.total) * 100;

  return (
    <>
      <style>{styles}</style>
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500 bg-opacity-35 p-4 absolute inset-0 left-0  ">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-white" />
    </button>
        <div className="w-96 mb-8">
          <div className="flex justify-between text-white mb-2">
            <span>{progress.current} / {progress.total} Cards</span>
            <div className="flex gap-4">
              <span className="text-green-300">✓ {progress.correct}</span>
              <span className="text-red-300">✗ {progress.incorrect}</span>
            </div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="relative w-96 h-60 perspective mb-8">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="absolute w-full"
              style={{
                zIndex: cards.length - index,
                transform: `
                  translateY(${card.offset}px) 
                  translateX(${card.position === 'left' ? '-200%' : card.position === 'right' ? '200%' : '0'})
                `,
                opacity: card.position === 'center' ? 1 : 0,
                transition: 'all 0.3s ease-in-out',
              }}
            >
              <div 
                className={`relative w-full h-60 transition-transform duration-700 preserve-3d cursor-pointer
                  ${card.isFlipped ? 'rotate-y-180' : ''}`}
                onClick={() => handleFlip(card.id)}
              >
                {/* Front */}
                <div className="absolute inset-0 w-full h-full backface-hidden">
                  <div className="w-full h-full rounded-xl bg-white shadow-2xl p-8 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-purple-500 mb-4 flex items-center justify-center">
                      <span className="text-3xl text-white">{card.id}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{card.front}</h2>
                    <p className="text-gray-600 text-center">اضغط للاجابة</p>
                  </div>
                </div>

                <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-400 to-purple shadow-2xl p-8 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white mb-4 flex items-center justify-center">
                      <span className="text-3xl">✨</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">الاجابة: {card.back}</h2>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {cards.length > 0 && (
          <div className="flex gap-4">

            <button 
              onClick={() => handleSwipe('right')}
              className="bg-white p-4 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-red-500" />
            </button>
            <button 
              onClick={() => handleSwipe('left')}
              className="bg-white p-4 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <Check className="w-6 h-6 text-green-500" />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default StartLearning;