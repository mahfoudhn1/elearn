"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, BookOpen } from "lucide-react";
import DeckSkeleton from "./deckskelton";
import axiosClientInstance from "../lib/axiosInstance";
import { Deck } from "../types/student";
import AddDeck from "./adddeck";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "../components/dahsboardcomponents/sidebar";


const FlashcardDeckPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModelOpen, setIsModelOpen] = useState<Boolean>(false)
  const [selectedDeckId, setSelectedDeckId] = useState(null)

  const router = useRouter();


  useEffect(() => {
    const fetchDecks = async () => {
      setLoading(true);
      try {
        const response = await axiosClientInstance.get("/flashcards/decks/");
        const data = response.data;

        const processedDecks = data.map((deck: Deck) => ({
          ...deck,
          totalCards: Array.isArray(deck.flashcards) ? deck.flashcards.length : 0,
          deckprogress: Array.isArray(deck.progress) && deck.progress.length > 0 
            ? Math.round(
                (Number(deck.progress[0]?.correct_answers || 0) / 
                Number(deck.progress[0]?.total_flashcards || 1)) * 100
              )
            : 0,
        }));
   
        setDecks(processedDecks);
      } catch (error) {
        console.error("Error fetching decks:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchDecks();
  }, []);
  
  const handleCreateDeck = async (newDeck: { title: string; description: string; subject: string; visibility: string }) => {
    try {
      const response = await axiosClientInstance.post('/flashcards/decks/', newDeck)
      if(response.data){
        setDecks((prevDeck)=>[...prevDeck, response.data])
      }
      
      setIsModelOpen(false); 
    } catch (error) {
      console.error("Error creating deck:", error);
    } 
  };

  const subjects = ["all", ...Array.from(new Set(decks.map((deck) => deck.subject)))];
  
  const filteredDecks = decks.filter((deck) => {
    const matchesSearch = deck.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === "all" || deck.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const onDelete = async(id: string)=>{
    try {
      await axiosClientInstance.delete(`/flashcards/decks/${id}/`);
      setDecks((prevDecks) => prevDecks.filter((deck) => deck.id !== id));
    } catch (error) {
      console.error("Error deleting deck:", error);
    }
  
  }

  function toggleMenu(deckId:any ): void {

    setSelectedDeckId(selectedDeckId === deckId ? null : deckId);

  }

  return (
    <div className="min-h-screen  bg-gray-light p-6 flex">
      <Sidebar/>
    <div className="container mx-auto p-6 w-full max-w-4xl">

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-xl font-bold mb-4">Flashcard Decks</h1>
        <div className="flex items-center gap-4">
          <BookOpen className="w-8 h-8 text-blue-500" />
          <div>
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold">
                  {decks.reduce((acc, deck) => acc + deck.totalCards, 0)}
                </p>
                <p className="text-gray-500">Total Flashcards Created</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search decks..."
            className="w-full pl-10 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading}
          />
        </div>
        <select
          className="p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          disabled={loading}
        >
          {subjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject.charAt(0).toUpperCase() + subject.slice(1)}
            </option>
          ))}
        </select>
        <button
          onClick={() => setIsModelOpen(true)}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          <Plus className="w-4 h-4" />
          Add Deck
        </button>
      </div>

      {/* Deck List */}
      <div className="grid gap-4">
        {loading ? (
          <>
            <DeckSkeleton />
            <DeckSkeleton />
            <DeckSkeleton />
            <DeckSkeleton />
          </>
        ) : (
          filteredDecks.map((deck) => (
            <div key={deck.id} 
            className="bg-white cursor-pointer rounded-lg shadow-md hover:shadow-lg transition-shadow"
            onClick={() => router.push(`/flashcards/${deck.id}`)}
            >
             
                <div className="p-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-lg">{deck.title}</h3>
                      <span className="text-sm text-gray-500">{deck.subject}</span>
                      <div className="relative"
                        onClick={(e)=>e.stopPropagation()}
                      >
                        <button
                          className="text-gray-500 hover:text-gray-700 focus:outline-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMenu(deck.id);
                          }}
                        >
                          &#x22EE; {/* Vertical three-dot icon */}
                        </button>
                        {selectedDeckId === deck.id && (
                          <div className="absolute top-6 left-0 bg-white shadow-md rounded-md p-2 z-10">
                            <button
                              className="text-red-500 hover:text-red-700 focus:outline-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(deck.id);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${deck.deckprogress}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500">
                        {deck.deckprogress}% • {deck.totalCards} cards
                      </span>
                    </div>
                  </div>
                </div>

            </div>
          ))
        )
        
        }
        {isModelOpen && (
        <AddDeck
          isOpen={true}
          onClose={() => setIsModelOpen(false)}
          onSubmit={handleCreateDeck}
        />
      )}
      </div>
    </div>
    </div> 
    );
};

export default FlashcardDeckPage;
