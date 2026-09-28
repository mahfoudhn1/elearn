"use client";

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axiosClientInstance from '../../lib/axiosInstance';
import { RootState } from '../../../store/store';
import { useRouter } from 'next/navigation';

interface Proficiency {
  id: string;
  score: number;
  level_name: string;
  language_name: string;
  created_at?: string; 
}

export default function LanguageTestResultsPage() {
  const [proficiencies, setProficiencies] = useState<Proficiency[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useSelector((state: RootState) => state.auth.user);
  const router = useRouter()
  useEffect(() => {
    const fetchProficiencies = async () => {
      try {
        const res = await axiosClientInstance.get('/lan/language-proficiencies/');
        setProficiencies(res.data);
        
      } catch (error) {
        console.error('Error fetching proficiencies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProficiencies();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-orange-600';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const handleTeacher=(name:string)=>{
    router.push(`/teachers?teaching_subjects=${name}`)
  }
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">مستواك في اللغة</h1>
          <p className="text-gray-500 mt-2">نتائج امتحان المستوى</p>
        </div>

        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading your results...</p>
          </div>
        ) : proficiencies.length > 0 ? (
          <div className="space-y-6">
            {proficiencies.map((proficiency) => (
              <div key={proficiency.id} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <span className="text-gray-500">الامتحان</span>
                  <span className="font-medium text-gray-800">
                    {formatDate(proficiency.created_at)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500">اللغة</p>
                    <p className="font-medium text-gray-800">{proficiency.language_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">المستوى</p>
                    <p className="font-medium text-gray-800">{proficiency.level_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">النقاط</p>
                    <p className={`font-bold text-xl ${getScoreColor(proficiency.score)}`}>
                      {proficiency.score}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">الملاحظة</p>
                    {proficiency.score >= 80 ? (
                      <p className="text-green-500">ممتاز</p>
                    ) : proficiency.score >= 50 ? (
                      <p className="text-yellow-400">جيد</p>
                    ) : (
                      <p className="text-red-500">تابع الدراسة بجد</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <button
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200"
                  onClick={() => { /* Add find teachers logic */ }}                >
                  اعادة الامتحان
                </button>
                <button
                  className="flex-1 py-3 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition duration-200"
                  onClick={() => handleTeacher(proficiency.language_name)}

                  
                >
                  العثور على اساتذة
                </button>
              </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500">No test results found</p>
          </div>
        )}


      </div>
    </div>
  );
}