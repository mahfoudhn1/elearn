"use client"
import React, { useState, useEffect } from "react";
import { TimePicker } from 'react-ios-time-picker';
import axiosClientInstance from "../../lib/axiosInstance";

interface Todo {
  id: number;
  time: string; // "HH:mm" format
  title: string;
  description?: string;
  completed: boolean;
}

const DayViewCalendar = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState<Omit<Todo, 'id' | 'completed'>>({
    time: new Date().toTimeString().slice(0, 5), // Current time in "HH:mm"
    title: "",
    description: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch todos
  const fetchTodos = async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosClientInstance.get('/notes/todos/');
      setTodos(data);
    } finally {
      setIsLoading(false);
    }
  };

  // Add new todo
  const addTodo = async () => {
    if (!newTodo.title.trim()) return;
    
    setIsLoading(true);
    try {
      await axiosClientInstance.post('/notes/todos/', {
        ...newTodo,
        completed: false
      });
      await fetchTodos();
      setNewTodo({
        time: new Date().toTimeString().slice(0, 5),
        title: "",
        description: ""
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle completion
  const toggleComplete = async (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    try {
      await axiosClientInstance.put(`/notes/todos/${id}/`, {
        ...todo,
        completed: !todo.completed
      });
      fetchTodos();
    } catch (error) {
      console.error("Error updating todo:", error);
    }
  };

  // Delete todo
  const deleteTodo = async (id: number) => {
    try {
      await axiosClientInstance.delete(`/notes/todos/${id}/`);
      setTodos(todos.filter(todo => todo.id !== id));
    } catch (error) {
      console.error("Error deleting todo:", error);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">مهام اليوم</h1>
      
      {/* Add Todo Form */}
      <div className="mb-8 p-4 bg-white rounded-lg">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">وقت</label>
          <TimePicker
            value={newTodo.time}
            onChange={(time:any) => setNewTodo({...newTodo, time})}
            clockClassName="bg-white"
            className="w-full"
          />
        </div>

        <input
          type="text"
          value={newTodo.title}
          onChange={(e) => setNewTodo({...newTodo, title: e.target.value})}
          placeholder="عنوان"
          className="w-full p-2 border border-gray rounded-lg mb-2"
        />

        <button
          onClick={addTodo}
          disabled={isLoading}
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue disabled:opacity-50"
        >
          {isLoading ? 'اضافة...' : 'اضافة مهمة'}
        </button>
      </div>

      {/* Todo List */}
      {isLoading && !todos.length ? (
        <p className="text-center py-4">Loading...</p>
      ) : todos.length === 0 ? (
        <p className="text-center py-4 text-gray-700">فارغة</p>
      ) : (
        <div className="space-y-3">
          {todos.map(todo => (
  <div 
    key={todo.id} 
    className={`p-4 rounded-xl shadow-sm border border-gray-100 transition-all duration-200 ${
      todo.completed ? 'bg-gray-50 opacity-75' : 'bg-white hover:shadow-md'
    }`}
  >
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-gray-500 font-medium">
            {todo.time}
          </span>
          <h3 
            className={`text-lg font-semibold truncate ${
              todo.completed 
                ? 'text-gray-400 line-through decoration-2' 
                : 'text-gray-800'
            }`}
          >
            {todo.title}
          </h3>
        </div>
        {todo.description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {todo.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => toggleComplete(todo.id)}
          className={`p-2 rounded-full transition-colors duration-150 ${
            todo.completed 
              ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' 
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          }`}
        >
          {todo.completed ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          )}
        </button>
        <button
          onClick={() => deleteTodo(todo.id)}
          className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
))}
        </div>
      )}
    </div>
  );
};

export default DayViewCalendar;