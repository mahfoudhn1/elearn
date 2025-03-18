"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import axiosClientInstance from '../lib/axiosInstance';
import { RootState } from '../../store/store';

interface PrivateSession {
  id: number;
  student: { user: { first_name: string; last_name: string } };
  teacher: { user: { first_name: string; last_name: string } };
  proposed_date: string;
  status: string;
  student_notes?: string;
  teacher_notes?: string;
}

const PrivateSessionsPage = () => {
  const router = useRouter();
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const [sessions, setSessions] = useState<PrivateSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userRole) {
      router.push('/login');
      return;
    }

    const fetchSessions = async () => {
      try {
        const response = await axiosClientInstance.get('/privet/session-requests/');
        console.log(response.data);
        setSessions(response.data);
      } catch (err) {
        setError('فشل في جلب الجلسات الخاصة');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [userRole, router]);

  // Handle session deletion
  const handleDelete = async (sessionId: number) => {
    const confirmed = window.confirm('هل أنت متأكد من حذف طلب الجلسة هذا؟');
    if (!confirmed) return;

    try {
      await axiosClientInstance.delete(`/session-requests/delete/${sessionId}/`);
      setSessions(sessions.filter((session) => session.id !== sessionId));
      alert('تم حذف طلب الجلسة بنجاح');
    } catch (err) {
      setError('فشل في حذف طلب الجلسة');
      console.error(err);
    }
  };
  const handleseassion = async(id:number)=>{
    router.push(`/privet-sessions/${id}`)
  }

  if (loading) {
    return <div className="text-center mt-8">جاري التحميل...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-800">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-semibold mb-8 text-gray-800 text-center">
        الجلسات الخاصة
      </h1>

      <div className="overflow-x-auto rounded-xl shadow-lg bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                المعرف
              </th>
              {userRole === 'student' && (
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  المعلم
                </th>
              )}
              {userRole === 'teacher' && (
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  الطالب
                </th>
              )}
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                التاريخ
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                الحالة
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                ملاحظات الطالب
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                ملاحظات المعلم
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-light">
            {sessions.map((session) => (
              <tr key={session.id} className="hover:bg-gray-light cursor-pointer transition-colors"
              onClick={()=>{handleseassion(session.id)}}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-dark">
                  {session.id}
                </td>
                {userRole === 'student' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-dark">
                    {session.teacher.user.first_name} {session.teacher.user.last_name}
                  </td>
                )}
                {userRole === 'teacher' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-dark">
                    {session.student.user.first_name} {session.student.user.last_name}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-dark">
                  {new Date(session.proposed_date).toLocaleDateString('ar-EG')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      session.status === 'accepted'
                        ? 'bg-green-200 text-green-800'
                        : session.status === 'rejected'
                        ? 'bg-red-300 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {session.status === 'accepted' ? 'مقبول' : session.status === 'rejected' ? 'مرفوض' : 'معلق'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-right text-gray-700">
                  {session.student_notes
                    ? `${session.student_notes.substring(0, 50)}${session.student_notes.length > 50 ? '...' : ''}`
                    : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-right text-gray-700">
                  {session.teacher_notes
                    ? `${session.teacher_notes.substring(0, 50)}${session.teacher_notes.length > 50 ? '...' : ''}`
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <button
                    onClick={() => handleDelete(session.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-800 transition-colors"
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PrivateSessionsPage;