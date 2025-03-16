"use client"
import React, { useState, useEffect } from "react";
import TimePicker from "react-time-picker";
import axios from "axios";
import "react-time-picker/dist/TimePicker.css";
import axiosClientInstance from "../../lib/axiosInstance";

interface TodoList {
  id: number;
  time: string;
  title: string;
  description?: string;
  completed: boolean;
}

const DayViewCalendar: React.FC = () => {
  const [Todos, setTodos] = useState<TodoList[]>([]);
  const [newTime, setNewTime] = useState<string | null>("10:00");
  const [newTitle, setNewTitle] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");



  // Fetch Todos from the backend
  const fetchTodos = async () => {
    try {
      const response = await axiosClientInstance.get('/notes/todos/');
      setTodos(response.data);
    } catch (error) {
      console.error("Error fetching Todos:", error);
    }
  };

  // Add a new Todo
  const addTodo = async () => {
    if (!newTime || !newTitle) return;
    try {
      const Todo = {
        time: newTime,
        title: newTitle,
        description: newDescription,
        completed: false,
      };
      await axiosClientInstance.post('/notes/todos/', Todo);
      fetchTodos(); // Refresh the list
      setNewTime("10:00");
      setNewTitle("");
      setNewDescription("");
    } catch (error) {
      console.error("Error adding Todo:", error);
    }
  };

  // Toggle Todo completion
  const toggleComplete = async (id: number) => {
    try {
      const Todo = Todos.find((l) => l.id === id);
      if (Todo) {
        const updatedTodo = { ...Todo, completed: !Todo.completed };
        await axiosClientInstance.put(`/notes/todos/${id}/`, updatedTodo);
        fetchTodos(); // Refresh the list
      }
    } catch (error) {
      console.error("Error updating Todo:", error);
    }
  };

  // Delete a Todo
  const deleteTodo = async (id: number) => {
    try {
      await axiosClientInstance.delete(`/notes/todos/${id}/`);
      fetchTodos(); // Refresh the list
    } catch (error) {
      console.error("Error deleting Todo:", error);
    }
  };

  // Fetch Todos on component mount
  useEffect(() => {
    fetchTodos();
  }, []);

  return (
    <div className="flex items-center justify-center">
      <div className="w-full shadow-lg">
        <div className="md:p-8 text-center bg-white rounded-t">
          <div className="px-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">دروس اليوم</h1>
          </div>
        </div>
        <div className="md:py-8 py-5 md:px-8 px-5 bg-white rounded-b">
          {/* Add Todo Form */}
          <div className="mb-6">
            <div className="mb-2">
              <TimePicker
                onChange={setNewTime}
                value={newTime}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                clearIcon={null}
                clockIcon={null}
              />
            </div>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title (e.g., مراجعة عامة)"
              className="w-full p-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full p-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addTodo}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-300"
            >
              Add Todo
            </button>
          </div>

          {/* Display Todos */}
          <div className="px-4">
            {Todos.map((Todo) => (
              <div
                key={Todo.id}
                className={`border-b pb-4 border-gray-700 border-dashed ${
                  Todo.completed ? "opacity-50" : ""
                }`}
              >
                <p className="text-xs font-light leading-3 text-gray-500">
                  {Todo.time}
                </p>
                <p
                  className={`text-lg font-medium leading-5 text-gray-800 pt-2 ${
                    Todo.completed ? "line-through" : ""
                  }`}
                >
                  {Todo.title}
                </p>
                {Todo.description && (
                  <p className="text-sm pt-2 leading-4 text-gray-500">
                    {Todo.description}
                  </p>
                )}
                <div className="flex items-center space-x-2 mt-2">
                  <button
                    onClick={() => toggleComplete(Todo.id)}
                    className={`p-1 rounded-full ${
                      Todo.completed
                        ? "bg-green-500 hover:bg-green-600"
                        : "bg-gray-300 hover:bg-gray-400"
                    } transition duration-300`}
                  >
                    {Todo.completed ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-white"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-white"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 5a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm0 5a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm0 5a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => deleteTodo(Todo.id)}
                    className="p-1 bg-red-500 rounded-full hover:bg-red-600 transition duration-300"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayViewCalendar;