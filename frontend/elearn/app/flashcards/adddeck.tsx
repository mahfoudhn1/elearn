
import React, { useState } from 'react'
import { Earth, Lock } from 'lucide-react';
import subjects from "../../public/data/subjects.json";

interface AddDeck{
    isOpen : boolean;
    onClose:()=>void;
    onCreate : (title :string)=> void;
    onSubmit: (newDeck: { title: string; description: string; subject: string; visibility: string }) => void;
  }

function AddDeck({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newDeck: { title: string; description: string; subject: string; visibility: string }) => void;
}) {
  
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

  const handleSubjsctChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSubject(event.target.value);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-md shadow-lg max-w-sm w-full">
      <h2 className="text-xl font-semibold mb-4">Create New Deck</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Deck Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
         <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
      <select
        value={subject}
        onChange={handleSubjsctChange}
        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="" disabled>
          Select a subject
        </option>
        {subjects.map((subject) => (
          <option key={subject.value} value={subject.value}>
            {subject.label}
          </option>
        ))}
      </select>
    </div>
       <div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
  <div className="flex flex-col space-y-2">
    {/* Private Option */}
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="radio"
            name="visibility"
            value="private"
            checked={visibility === "private"}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-4 h-4 text-blue-500 focus:ring-blue-500 cursor-pointer border-gray-300"
          />
          <div className="flex items-center space-x-2">
            <Lock className="text-gray-500 w-5 h-5" />
            <span className="text-gray-800">Private</span>
          </div>
        </label>

        {/* Public Option */}
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="radio"
            name="visibility"
            value="public"
            checked={visibility === "public"}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-4 h-4 text-blue-500 focus:ring-blue-500 cursor-pointer border-gray-300"
          />
          <div className="flex items-center space-x-2">
            <Earth className="text-gray-500 w-5 h-5" />
            <span className="text-gray-800">Public</span>
          </div>
        </label>
      </div>
    </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  </div>
    )
}

export default AddDeck