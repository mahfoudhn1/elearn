"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axiosClientInstance from '../../../lib/axiosInstance';

interface Question {
  id: string;
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
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const params = useParams()
  const languageId = params.id;

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await axiosClientInstance.get<PaginatedQuestions>(`/lan/tests/${languageId}/questions/`);
      setQuestions(res.data.results);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleSelect = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        language_id: languageId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          question_id: questionId,
          answer
        }))
      };
      await axiosClientInstance.post('/lan/tests/submit/', payload);
      alert('Test submitted successfully!');
      router.push('/languages/level'); 
    } catch (error) {
      console.error(error);
      alert('Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const allQuestionsAnswered = questions.every(q => answers[q.id] !== undefined && answers[q.id] !== '');
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen b">
        <div className="w-12 h-12 border-4 border-grey-900 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">Preparing your test...</p>
      </div>
    );
  }

  if (questions.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen ">
        <p className="text-gray-600">No questions available for this test.</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 min-h-screen flex flex-col ">
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-4 mb-8">
        <div 
          className="bg-grey-900 h-4 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <div className="text-center mb-4">
        <span className="text-sm font-medium text-grey-900">
          سؤال {currentQuestionIndex + 1} من {questions.length}
        </span>
      </div>

      <header className="mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">اختبار تحديد مستوى اللغة</h1>
      </header>

      <main className="flex-1 flex flex-col">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex-1 flex flex-col">
          <p className="font-medium text-gray-800 mb-6 text-lg text-left " dir="auto">
            {currentQuestion.text}
          </p>

          <div className="flex-1">
            {['multiple_choice', 'true_false'].includes(currentQuestion.question_type) && currentQuestion.options && (
              <div className="space-y-3">
                {Object.entries(currentQuestion.options).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => handleSelect(currentQuestion.id, key)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                      answers[currentQuestion.id] === key 
                        ? 'bg-blue-100 border-2 border-orange-600 text-grey-900' 
                        : 'border border-gray-200 hover:border-orange hover:bg-orange-600'
                    }`}
                  >
                    <span className="font-medium">{key}.</span> {value}
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.question_type === 'fill_blank' && (
              <div className="mt-3">
                <input
                  type="text"
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleSelect(currentQuestion.id, e.target.value)}
                  placeholder="اكتب إجابتك هنا..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent text-right"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100">
            <button
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
              className={`px-6 py-2.5 rounded-lg font-medium transition flex items-center ${
                currentQuestionIndex > 0
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              السابق
            </button>
            
            {currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!answers[currentQuestion.id]}
                className={`px-6 py-2.5 rounded-lg font-medium transition flex items-center ${
                  answers[currentQuestion.id]
                    ? 'bg-orange-600 hover:bg-orange text-white'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                التالي
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !allQuestionsAnswered}
                className={`px-6 py-2.5 rounded-lg font-medium transition flex items-center ${
                  submitting || !allQuestionsAnswered
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-grey-900 hover:bg-blue-700 text-white'
                }`}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    إرسال الإجابات
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>

      {!allQuestionsAnswered && currentQuestionIndex === questions.length - 1 && (
        <p className="text-sm text-center text-red-400 mt-4">
          يجب الإجابة على جميع الأسئلة قبل الإرسال
        </p>
      )}
    </div>
  );
}