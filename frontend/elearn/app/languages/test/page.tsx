"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axiosClientInstance from '../../lib/axiosInstance';

interface Question {
  id: number;
  text: string;
  question_type: string;
  options?: { [key: string]: string } | null;
}

interface PaginatedQuestions {
  count: number;
  next: string | null;
  previous: string | null;
  results: Question[];
}

export default function LanguageTestPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [prevPage, setPrevPage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const languageId = "2";

  const fetchQuestions = async (url?: string) => {
    setLoading(true);
    try {
      const endpoint = url ?? `/lan/tests/${languageId}/questions/?page=1&page_size=5`;
      const res = await axiosClientInstance.get<PaginatedQuestions>(endpoint);
      setQuestions(res.data.results);
      setNextPage(res.data.next);
      setPrevPage(res.data.previous);
      if (url?.includes('page=')) {
        const pageNum = new URL(url).searchParams.get('page');
        setCurrentPage(pageNum ? parseInt(pageNum) : 1);
      } else {
        setCurrentPage(1);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleSelect = (questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        language_id: parseInt(languageId),
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          question_id: parseInt(questionId),
          answer
        }))
      };
      await axiosClientInstance.post('/lan/tests/submit/', payload);
      alert('Test submitted successfully!');
      // router.push('/dashboard');
    } catch (error) {
      console.error(error);
      alert('Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const allQuestionsAnswered = questions.every(q => answers[q.id] !== undefined && answers[q.id] !== '');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">Preparing your test...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 min-h-screen flex flex-col">
      <header className="mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">أسئلة لتحديد مستوى اللغة</h1>
        <p className="text-gray-500 mt-2">المرجو الاجابة عن كل الاسئلة لتسهيل على الاساتذة التعرف على مستواك</p>
      </header>

      <main className="flex-1">
        <div className="space-y-5">
          {questions.map((question) => (
            <div key={question.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <p className="font-medium text-gray-800 mb-4 text-lg">Question {question.id}: {question.text}</p>

              {['multiple_choice', 'true_false'].includes(question.question_type) && question.options && (
                <div className="space-y-2">
                  {Object.entries(question.options).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => handleSelect(question.id, key)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                        answers[question.id] === key 
                          ? 'bg-blue-50 border-2 border-blue-500 text-blue-700' 
                          : 'border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <span className="font-medium">{key}.</span> {value}
                    </button>
                  ))}
                </div>
              )}

              {question.question_type === 'fill_blank' && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={answers[question.id] || ''}
                    onChange={(e) => handleSelect(question.id, e.target.value)}
                    placeholder="Type your answer..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-8">
          <button
            disabled={!prevPage}
            onClick={() => fetchQuestions(prevPage!)}
            className={`px-5 py-2.5 rounded-lg font-medium transition ${
              prevPage 
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          >
           →  السابق
          </button>
          
          <span className="text-sm text-gray-500">Page {currentPage}</span>
          
          <button
            disabled={!nextPage}
            onClick={() => fetchQuestions(nextPage!)}
            className={`px-5 py-2.5 rounded-lg font-medium transition ${
              nextPage 
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          >
            التالي ←
          </button>
        </div>
      </main>

      <footer className="mt-8 border-t border-gray-100 pt-6">
        <button
          onClick={handleSubmit}
          disabled={submitting || !allQuestionsAnswered}
          className={`w-full py-3.5 rounded-lg font-semibold transition-all duration-200 ${
            submitting || !allQuestionsAnswered
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            'رفع الاجوبة'
          )}
        </button>
        
        {!allQuestionsAnswered && (
          <p className="text-sm text-center text-red-300 mt-3">
            المرجو الاجابة على كل الاسئلة قبل الرفع
          </p>
        )}
      </footer>
    </div>
  );
}