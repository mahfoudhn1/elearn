import React, { useState } from 'react';
import { Answer, Question } from '../../types/student';

interface QuizAnswerFormProps {
  questions: Question[];
  onSubmit: (answers: { [questionId: number]: Answer | string }) => void;
}

const QuizAnswerForm: React.FC<QuizAnswerFormProps> = ({ questions, onSubmit }) => {
  const [answers, setAnswers] = useState<{ [questionId: number]: Answer | string }>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const handleAnswerChange = (questionId: number, answer: Answer | string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    onSubmit(answers);
  };

  const currentQuestion = questions[currentQuestionIndex];

  const renderQuestionInput = (question: Question) => {
    switch (question.question_type) {
      case 'MC':
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => {
              const answer: Answer = {
                id: index,
                text: option,
                is_correct: option === question.correct_answer,
              };
              return (
                <label
                  key={index}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    checked={
                      (answers[question.id] as Answer)?.text === option
                    }
                    onChange={() => handleAnswerChange(question.id, answer)}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-800">{option}</span>
                </label>
              );
            })}
          </div>
        );
      case 'TF':
        return (
          <div className="space-y-3">
            {['True', 'False'].map((option, index) => {
              const answer: Answer = {
                id: index,
                text: option,
                is_correct: option === question.correct_answer,
              };
              return (
                <label
                  key={index}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    checked={
                      (answers[question.id] as Answer)?.text === option
                    }
                    onChange={() => handleAnswerChange(question.id, answer)}
                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-800">{option}</span>
                </label>
              );
            })}
          </div>
        );
      case 'SA':
        return (
          <textarea
            value={(answers[question.id] as string) || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 resize-y"
            rows={4}
            placeholder="Type your answer here..."
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6">
      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-gray-600">Points: {currentQuestion.points}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-indigo-600 h-2.5 rounded-full"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Content */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">{currentQuestion.text}</h2>
        <div className="text-sm text-gray-500 mb-4">
          {currentQuestion.question_type === 'MC'
            ? 'Multiple Choice'
            : currentQuestion.question_type === 'TF'
            ? 'True/False'
            : 'Short Answer'}
        </div>
        {renderQuestionInput(currentQuestion)}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className={`px-4 py-2 rounded-lg text-white transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            currentQuestionIndex === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          Previous
        </button>
        <div className="flex space-x-3">
          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Submit Quiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizAnswerForm;