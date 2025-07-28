import React from 'react';
import { Question, QuizProp, StudentAnswer } from '../../types/student';

interface QuizCardProps {
  quiz: QuizProp;

}

const Quiz: React.FC<QuizCardProps> = ({ quiz }) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getQuestionTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      MC: 'Multiple Choice',
      TF: 'True/False',
      SA: 'Short Answer',
    };
    return types[type] || 'Unknown';
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden transform transition-all hover:scale-[1.02] duration-300">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
        <h2 className="text-2xl font-bold truncate">{quiz.title}</h2>
        <p className="mt-2 text-sm opacity-90 line-clamp-2">{quiz.description || 'No description provided'}</p>
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Quiz Details */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <span className="text-gray-500 text-sm">Created</span>
            <p className="font-medium">{formatDate(quiz.created_at)}</p>
          </div>
          <div>
            <span className="text-gray-500 text-sm">Time Limit</span>
            <p className="font-medium">{quiz.time_limit_minutes} minutes</p>
          </div>
          <div>
            <span className="text-gray-500 text-sm">Questions</span>
            <p className="font-medium">{quiz.questions.length}</p>
          </div>
          <div>
            <span className="text-gray-500 text-sm">Status</span>
            <p className={`font-medium ${quiz.is_published ? 'text-green-600' : 'text-red-600'}`}>
              {quiz.is_published ? 'Published' : 'Draft'}
            </p>
          </div>
        </div>

        {/* Questions Preview */}
        {quiz.questions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Questions</h3>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
              {quiz.questions.map((question, index) => (
                <div
                  key={question.id}
                  className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <span className="text-indigo-600 font-medium mr-3">{index + 1}.</span>
                  <div>
                    <p className="text-gray-800">{question.text.substring(0, 50)}...</p>
                    <span className="text-sm text-gray-500">
                      {getQuestionTypeLabel(question.question_type)} • {question.points} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attempt Information */}
        
      </div>

      {/* Footer Actions */}
      <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">

          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            View Results
          </button>
        {quiz.is_published && (
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Start Quiz
          </button>
        )}
      </div>
    </div>
  );
};

export default Quiz;