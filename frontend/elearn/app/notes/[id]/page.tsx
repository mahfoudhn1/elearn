'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axiosClientInstance from '../../lib/axiosInstance';
import { format } from 'date-fns';
import draftToHtml from 'draftjs-to-html';  // Import the draftjs-to-html library
import { EditorState, convertFromRaw, convertToRaw } from 'draft-js'; // For handling Draft.js editor state
import { Editor } from 'react-draft-wysiwyg';
import { convertToHTML } from 'draft-convert';
import html2canvas from 'html2canvas';

import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import 'draft-js/dist/Draft.css';
import { jsPDF } from 'jspdf';

interface Note {
  id: number;
  title: string;
  created_at: string;
  content: string;
}
interface MenuVisibleState {
  [noteId: number]: boolean; // Keeps track of visibility per note by noteId
}
const Note: React.FC = () => {
  const params = useParams() as { id: string };
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', subject: '' });
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [selectedNote, setSelectedNote] = useState<Note | null>(null); // Track selected note
  const [menuVisible, setMenuVisible] = useState<MenuVisibleState>({});  // Type the menuVisible state

  
  
  useEffect(() => {
  
    const fetchNotes = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axiosClientInstance.get(`/notes/notes/`,{
          params:{
            subject :  params.id
          }
        }
        );
        setNotes(response.data);
      } catch (err) {
        setError('Failed to fetch notes. Please try again later.');
        console.error('Error fetching notes:', err);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchNotes();
  }, [params.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewNote((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    const contentState = editorState.getCurrentContent();
    const contentAsJson = JSON.stringify(convertToRaw(contentState)); 
  
    try {
      let response: any;
      if (selectedNote) {
        response = await axiosClientInstance.put(`/notes/notes/${selectedNote.id}/`, {
          ...newNote,
          content: contentAsJson,
        });
        setNotes((prev) => prev.map((note) => (note.id === selectedNote.id ? response.data : note)));
      } else {

        response = await axiosClientInstance.post('/notes/notes/', {
          ...newNote,
          content: contentAsJson, 
        });
        setNotes((prev) => [response.data, ...prev]);
      }
  
      setNewNote({ title: '', content: '', subject:decodeURIComponent(params.id) });
      setEditorState(EditorState.createEmpty());
      setSelectedNote(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };
  
  const handleaddnote = ()=>{
    setNewNote({ title: '', content: '', subject:decodeURIComponent(params.id) });
    setSelectedNote(null); 
    setEditorState(EditorState.createEmpty());
    setShowForm(true);
  }
  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setNewNote({ title: note.title, content: note.content, subject:decodeURIComponent(params.id) }); 
    const rawContent = JSON.parse(note.content);

    const contentState = convertFromRaw(rawContent);

    setEditorState(EditorState.createWithContent(contentState));
    setShowForm(true);
  };
  const toggleMenu = (noteId: number) => {
    setMenuVisible((prev) => ({
      ...prev,
      [noteId]: !prev[noteId],
    }));
  };
  
  const deleteNote = async (noteId: number) => {
    if (window.confirm("متأكد من حذف المذكرة ؟")) {
      try {
        await axiosClientInstance.delete(`/notes/notes/${noteId}/`);
        

        setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
        
      } catch (error) {
        console.error("Error deleting note:", error);
        alert("Failed to delete the note. Please try again.");
      }
    }
  };
  
  const exportAsPDF = async (note: Note) => {
    try {
      const rawContent = JSON.parse(note.content);
      const contentState = convertFromRaw(rawContent);
      const editorStateForPDF = EditorState.createWithContent(contentState);

      const contentHTML = convertToHTML(editorStateForPDF.getCurrentContent());

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      pdf.setFontSize(16);
      pdf.text(note.title, 20, 20);

      pdf.setFontSize(10);
      pdf.text(`Created on: ${format(new Date(note.created_at), 'MMM dd, yyyy')}`, 20, 30);

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = contentHTML;
      tempDiv.style.width = '170mm'; // Adjusted for margins
      tempDiv.style.padding = '10px';
      tempDiv.style.boxSizing = 'border-box';
      document.body.appendChild(tempDiv);

 
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth() - 40; // Account for margins
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 20, 40, pdfWidth, pdfHeight);

      pdf.save(`${note.title || 'note'}_${format(new Date(note.created_at), 'yyyy-MM-dd')}.pdf`);

      document.body.removeChild(tempDiv);

    } catch (error) {
      console.error('PDF conversion error:', error);
      alert('Failed to export PDF. Please try again.');
    }};
    const uploadImageCallback = async (file:any) => {
      const formData = new FormData();
      formData.append('file', file);
    
      try {
        const response = await axiosClientInstance.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
    
        return {
          data: { 
            link: response.data.imageUrl 
          }
        };
      } catch (error) {
        console.error('Image upload failed', error);
        throw error;
      }
    };
      

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl w-full">
        <h1 className="text-4xl font-bold text-center mb-6 text-gray-800">مذكرات: {decodeURIComponent(params.id)} </h1>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-center text-red-500 font-medium">
            {error}
          </div>
        )}

        {/* Notes Display */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              className="bg-white rounded-lg shadow-md flex items-center justify-center cursor-pointer transform hover:scale-105 transition-transform duration-200 ease-in-out"
              onClick={() => handleaddnote()}
            >
              <div className="p-5 text-center">
                <h2 className="text-3xl font-semibold text-gray-500">+</h2>
                <p className="text-sm text-gray-400">اضافة مذكرات جديدة</p>
              </div>
            </div>

            {notes.map((note) => (
              <div
                key={note.id}
                className="relative bg-gray-light rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-200 ease-in-out"
                onClick={() => handleNoteClick(note)}
              >
                {/* Three Dots Menu */}
                <div className="absolute top-2 left-2 p-2">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); 
                        toggleMenu(note.id);
                      }}
                      className="p-1 rounded-full hover:bg-gray-200 focus:outline-none"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-600"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M10 3a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                      </svg>
                    </button>
                    {menuVisible[note.id] && (
                      <div
                        className="absolute left-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10"
                        onClick={(e) => e.stopPropagation()} // Prevent closing the menu when clicking inside
                      >
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left"
                        >
                          حذف
                        </button>
                        <button
                          onClick={() => exportAsPDF(note)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          Export as PDF
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Note Content */}
                <div className="p-5 mt-4 mr-4 max-h-60 overflow-y-auto">
                  <h2 className="text-xl font-semibold mb-2 text-gray-800">{note.title}</h2>
                  <div
                    className="text-gray-700"
                    dangerouslySetInnerHTML={{
                      __html: draftToHtml(JSON.parse(note.content)), // Convert Draft.js JSON to HTML
                    }}
                  />
                  <p className="text-sm text-gray-700 mt-4">
                    {format(new Date(note.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            ))}

          </div>
        )}

        {/* New Note Form Modal */}
        {showForm && (
          <div
            className={`fixed w-full  inset-0 bg-gray-700 bg-opacity-50 flex justify-center items-center z-50 transition-opacity duration-300 ${showForm ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setShowForm(false)}
          >
            <div
              className={`bg-white rounded-lg shadow-lg p-6 w-2/3 transform transition-transform duration-300 ${showForm ? 'scale-100' : 'scale-90'}`}
              onClick={(e) => e.stopPropagation()} // Prevent form close when clicking inside
            >
              <h2 className="text-lg font-medium mb-4">انشاء مذكرة</h2>

              <form onSubmit={handleFormSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="title">
                      عنوان المذكرة
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={newNote.title}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>

                  {/* Draft.js Editor */}
                  <div className="border max-h-96 overflow-y-auto rounded-md p-2">
                  <Editor
                    editorState={editorState}
                    onEditorStateChange={setEditorState}
                    wrapperClassName="wrapper-class"
                    editorClassName="p-4 min-h-[150px]"
                    toolbarClassName="border-b"
                    toolbar={{
                      options: [
                        'inline', 
                        'blockType', 
                        'fontSize', 
                        'fontFamily', 
                        'colorPicker', 
                        'list', 
                        'textAlign', 
                        'link', 
                        'image', 
                        'history'
                      ],
                      inline: { 
                        options: ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript']
                      },
                      blockType: {
                        inDropdown: true,
                        options: ['Normal', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'Blockquote', 'Code']
                      },
                      fontSize: {
                        options: [8, 9, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48, 60, 72, 96]
                      },
                      fontFamily: {
                        options: [
                          'Arial', 
                          'Georgia', 
                          'Impact', 
                          'Tahoma', 
                          'Times New Roman', 
                          'Verdana',
                          'Roboto',
                          'Montserrat'
                        ]
                      },
                      colorPicker: {
                        colors: [
                          'rgb(97,189,109)', 'rgb(26,188,156)', 'rgb(84,172,210)', 
                          'rgb(44,130,201)', 'rgb(147,101,184)', 'rgb(71,85,119)', 
                          'rgb(204,0,0)', 'rgb(255,102,0)', 'rgb(255,255,0)', 
                          'rgb(0,0,0)', 'rgb(255,255,255)'
                        ]
                      },
                      image: {
                        className: 'my-image-class',
                        uploadCallback: async (file:any) => {
                          // Implement your image upload logic here
                          // This is a placeholder - you'll want to replace with actual image upload
                          return new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              resolve({ data: { link: reader.result } });
                            };
                            reader.readAsDataURL(file);
                          });
                        },
                        previewImage: true,
                        alt: { present: true, mandatory: false }
                      },
                      link: {
                        inDropdown: false,
                        showOpenOptionOnHover: true,
                        defaultTargetOption: '_blank',
                        options: ['link']
                      },
                      textAlign: {
                        inDropdown: true,
                        options: ['left', 'center', 'right', 'justify']
                      }
                    }}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      الغاء
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
                    >
                      حفظ المذكرة
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Note;
