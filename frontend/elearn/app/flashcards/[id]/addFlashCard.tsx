import React, { useState } from 'react'


interface AddDeck{
    isOpen : boolean;
    onClose:()=>void;
    onSubmit: (newFlashcard: { front: string; back: string;}) => void;
    card?: { front: string; back: string } | null;   
}

function AddFlashCard({
    isOpen,
    onClose,
    onSubmit,
    card
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (newFlashcard: { front: string; back: string; }) => void;
    card?: { front: string; back: string } | null;
  }) {

    const [front, setFront] = useState(card?.front || '');
    const [back, setBack] = useState(card?.back || '');
  

    const handleSubmit = (e: React.FormEvent)=>{
        e.preventDefault();
        if (front.trim() && back.trim() ) {
            onSubmit({ front, back}); 
            setFront("");
            setBack("");
          }
        };

    if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-md shadow-lg max-w-sm w-full">
      <h2 className="text-xl font-semibold mb-4">انشاء بطاقة</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="وجه البطاقة"
          value={front}
          onChange={(e) => setFront(e.target.value)}
          className="w-full p-2 border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <textarea
          placeholder="ظهر البطاقة )الاجابة("
          value={back}
          onChange={(e) => setBack(e.target.value)}
          className="w-full p-2 border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            الغاء
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            {card ? "تعديل" : "انشاء"}
          </button>
        </div>
      </form>
    </div>
  </div>
  )
}

export default AddFlashCard