'use client';
import React, { useState, useRef } from 'react';
import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { EditorState, convertToRaw } from 'draft-js';
import 'draft-js/dist/Draft.css';
import { PlusCircle, XCircle, Lightbulb, Maximize, Minimize } from 'lucide-react';
import axiosClientInstance from '../lib/axiosInstance';

const NoteTakingApp = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [isFullWidth, setIsFullWidth] = useState(false);
  const formRef = useRef(null);

  const subjects = ['رياضيات', 'فيزياء', 'كيمياء', 'أحياء', 'فرنسية', 'عربية', 'إنجليزية', 'تاريخ', 'جغرافيا', 'فلسفة', 'اقتصاد'];

  const handleSubmit = async (e:any) => {
    e.preventDefault();

    const content = convertToRaw(editorState.getCurrentContent());

    try {
      const data = {
        title,
        subject,
        content:JSON.stringify(content)
      }
      const response = await axiosClientInstance.post('/notes/', data )
     
      if (response) {
        setIsOpen(false);
        setTitle('');
        setSubject('');
        setEditorState(EditorState.createEmpty());
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  return (
    <div>
      {/* Floating Bubble */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-8 left-8 w-14 h-14 flex items-center justify-center bg-yellow text-white rounded-full shadow-lg cursor-pointer z-50"
      >
        {isOpen ? <XCircle className="w-6 h-6" /> : <Lightbulb className="w-6 h-6" />}
      </div>

      {/* Note Taking Overlay */}
      {isOpen && (
        <div
          ref={formRef}
          className={`fixed bottom-20 left-8 ${isFullWidth ? 'w-1/2' : 'w-[300px]'} bg-white rounded-lg shadow-lg p-4 z-50 transition-all duration-300`}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">New Note</h2>
      
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                Subject
              </label>
              <select
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Select a subject</option>
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <div className="border rounded-md custom-editor">
                <Editor
                  editorState={editorState}
                  onEditorStateChange={setEditorState}
                  wrapperClassName="wrapper-class"
                  editorClassName="p-4 min-h-[150px]"
                  toolbarClassName="border-b"
                  toolbar={{
                    options: ['inline', 'fontSize', 'colorPicker', 'list', 'textAlign', 'history'],
                    inline: { options: ['bold', 'italic', 'underline', 'strikethrough'] },
                    fontSize: { options: [10, 12, 14, 16, 18, 24, 30] },
                  }}
                />
              </div>
            </div>

            <div className="flex justify-between space-x-2">
            
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-2 text-sm font-medium text-white bg-blue-300 rounded-md hover:bg-blue"
              >
                Save Note
              </button>
              <button
                type="button"
                onClick={() => setIsFullWidth((prev) => !prev)}
                className="text-gray-700 hover:text-gray-900"
              >
                {isFullWidth ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default NoteTakingApp;
