'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Deck, Flashcard } from '../../types/student'
import axiosClientInstance from '../../lib/axiosInstance'
import { useParams } from 'next/navigation'
import { Edit2, Play, Plus } from 'lucide-react'
import AddFlashCard from './addFlashCard'
import StartLearning from './StartLearning'



function singleDeck() {
    const [deck, setDeck] = useState<Deck>()
    const [visibleMenuId, setVisibleMenuId] = useState(null);
    const [isModelOpen, setIsModelOpen] = useState(false)
    const [editCard, setEditCard] = useState<Flashcard | null>(null); // Holds the card to edit, if any
    const [isStared, setIsStarted] = useState(false)

    const handleMenuToggle = (cardId:any) => {
      setVisibleMenuId(visibleMenuId === cardId ? null : cardId);
    };
    
    const params = useParams()

    useEffect(()=>{
        const fetchSingleDeck = async(params:any)=>{
            try{
                const response = await axiosClientInstance.get(`/flashcards/decks/${params.id}/`)
                if(response.data){
                  setDeck(response.data)                  
                }
            }catch(error){
                console.log(error);
                
            }
        }
        fetchSingleDeck(params)
    },[])

    
    const handleCreateFlashCard = async (newFlashcard:{front:string; back:string}) => {
      try {
        if (editCard) {
          const response = await axiosClientInstance.put(`/flashcards/${editCard.id}/`, {
            ...newFlashcard,
            deck: params.id,
          });
          setDeck((prevDeck: any) => ({
            ...prevDeck,
            flashcards: prevDeck.flashcards.map((card: any) =>
              card.id === editCard.id ? response.data : card
            ),
          }));
    
        }else{
          const response = await axiosClientInstance.post('/flashcards/', {
            ...newFlashcard,
            deck: params.id,
          });
          const createdFlashcard = response.data;
          setDeck((prevDeck:any) => {
            if (!prevDeck) {
              return { flashcards: [createdFlashcard] };
            }
            return {
              ...prevDeck,
              flashcards: [...(prevDeck.flashcards || []), createdFlashcard],
            };
          });

        }
  
        setIsModelOpen(false);
        setEditCard(null);
      } catch (error) {
        console.error("Error creating deck:", error);
      }

    };
    
    const handleDelete = async (cardId:any) => {
      await axiosClientInstance.delete(`/flashcards/${cardId}/`)
      setDeck((prevDeck: any) => ({
        ...prevDeck,
        flashcards: prevDeck.flashcards.filter((card: any) => card.id !== cardId),
      }));
      setVisibleMenuId(null);
    };
    
  return (
    <div className="min-h-screen  bg-gray-light p-6 flex">
      <div className="w-full relative mx-4">
        <div className="flex justify-between items-center mb-6">
          <div className='flex flex-col'>
            <h1 className="text-2xl text-gray-800 font-bold">{deck?.title}</h1>
            <p className='text-base text-gray-dark' > {deck?.description} </p>

          </div>
          <div className="flex gap-3">
          <button
              className="relative inline-flex items-center justify-center px-4 py-2 text-base font-bold text-gray-800 transition-all duration-200 bg-white font-pj border border-gray-800 hover:bg-gray-800 hover:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
              onClick={() => {
                setIsModelOpen(true); setEditCard(null);
              }}
            >
              اضافة بطاقة
            </button>

              <div className="relative inline-flex  group">
                  <div
                      className="absolute transitiona-all duration-1000 opacity-70 flex -inset-px bg-gradient-to-r from-[#44BCFF] via-[#FF44EC] to-[#FF675E] rounded-xl blur-lg group-hover:opacity-100 group-hover:-inset-1 group-hover:duration-200 animate-tilt">
                  </div>
                 
                  <button 
                      onClick={()=>setIsStarted(true)}
                      title="play"
                      className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-gray-800 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
                      role="button">أبدأ المراجعة
                  <Play className="w-4 h-4 mr-2" />
                  
                  </button>
              </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {deck?.flashcards.map((card) => (
        <div
          key={card.id}
          className="bg-white shadow-sm hover:shadow-md cursor-pointer transition-shadow relative"
        >
          <div className="p-6">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold">{card.front}</h3>
              <button
                onClick={() => handleMenuToggle(card.id)}
                className="text-gray-400 hover:text-gray-600 relative"
              >
                ⋮
              </button>
              {visibleMenuId === card.id && (
                <div
                className="absolute left-0 mt-6 w-32 bg-white rounded-md shadow-lg z-10"
                onClick={(e) => e.stopPropagation()} 
              >
                <button
                  onClick={() => handleDelete(card.id)}
                  className="block px-4 py-2 text-sm text-gray-dark text-right hover:bg-gray-300 w-full "
                >
                  حذف
                </button>
       
              </div>
              )}
            </div>
            <p className="text-sm text-gray-dark w-full flex justify-between">
              {new Date(card.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              <Edit2 className="h-8 w-8 px-2 cursor-pointer text-white text-end float-end m-2 bg-gray-800"
              onClick={() => { setIsModelOpen(true); setEditCard(card); }}
              />
            </p>
          </div>
        </div>
      ))}
    </div>
    {isModelOpen && (
    <AddFlashCard
      isOpen={true}
      onClose={() => setIsModelOpen(false)}
      onSubmit={handleCreateFlashCard}
      card={editCard}
    />
    )}
    {isStared && (
      
        <StartLearning
          isOpen={true}
          onClose={() => setIsStarted(false)}
          flashcards = {deck?.flashcards}
          DeckProgress = {deck?.progress}
        />
    )}
      </div>
    </div>
  )
}

export default singleDeck