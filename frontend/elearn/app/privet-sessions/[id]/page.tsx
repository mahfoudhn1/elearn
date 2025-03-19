"use client"
import React, { useState, useEffect } from "react";
import axiosClientInstance from "../../lib/axiosInstance";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import CheckUploadForm from "./CheckUploadForm";
import StartNowButton from "./livebutton";

const PrivateSessionDetail = () => {
  const [session, setSession] = useState<any>(null);
  const [status, setStatus] = useState("pending");
  const [proposedDate, setProposedDate] = useState("");
  const [teacherNotes, setTeacherNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = useParams()
  const role = useSelector((state:RootState)=>state.auth.user?.role)
  const sessionId = params.id

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await axiosClientInstance.get(`/privet/session-requests/list/${sessionId}/`);
        console.log(response.data);
        
        setSession(response.data);
        setStatus(response.data.status);
        setProposedDate(response.data.proposed_date || "");
        setTeacherNotes(response.data.teacher_notes || "");
        setLoading(false);
      } catch (err) {
        setError("فشل في جلب تفاصيل الحصة");
        setLoading(false);
      }
    };
    const fetchRoom = async()=>{
      
      try {
        const response = await axiosClientInstance.get(`/privet/session-requests/${sessionId}/get_jitsi_room_for_session/`);
        
        setLoading(false);
      } catch (err) {
        setError("فشل في جلب تفاصيل الحصة");
        setLoading(false);
      }
    }
    fetchSession();
    fetchRoom()
  }, [sessionId]);
  const formattedDate = session?.proposed_date
  ? new Date(session.proposed_date).toISOString().slice(0, 16) // Trims seconds & timezone
  : "";

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const response = await axiosClientInstance.patch(`/privet/session-requests/update/${sessionId}/`, {
        status: status,
        proposed_date: proposedDate,
        teacher_notes: teacherNotes,
      });
      setSession(response.data);
      alert("تم تحديث الحصة بنجاح!");
    } catch (err) {
      setError("فشل في تحديث الحصة");
    }
  };

  if (loading) return <div className="text-center text-gray">جاري التحميل...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-light to-gray-light flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 transform transition-all hover:shadow-2xl">
        <div className="flex">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-right">طلب حصة خاصة</h1>
        <StartNowButton proposedDate={proposedDate} />

        </div>
        <div className="space-y-8">
          {/* Student Details */}
          <div className="bg-gray-light p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 text-right">تفاصيل الطالب</h2>
            <div className="space-y-3 text-right">
              <p className="text-gray-700">
                <span className="font-medium">الاسم: </span>
                {session?.student?.user.first_name} {session?.student?.user.last_name}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">البريد الإلكتروني: </span>
                {session?.student?.user.email}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">الصف: </span>
                {session?.student?.grade.name}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">مجال الدراسة: </span>
                {session?.student?.field_of_study.name}
              </p>
            </div>
          </div>

          {/* Request Details */}
          <div className="bg-gray-light p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 text-right">تفاصيل الطلب</h2>
            <div className="space-y-3 text-right">
              <p className="text-gray-700">
                <span className="font-medium">تاريخ الطلب: </span>
                {new Date(session?.requested_at).toLocaleString()}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">الحالة: </span>
                {session?.status === "pending" ? "معلق" : session?.status === "accepted" ? "مقبول" : "مرفوض"}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">ملاحظات الطالب: </span>
                {session?.student_notes}
              </p>
            </div>
          </div>

          {/* Form */}
          {role == "teacher"? (
            <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right">الحالة</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-2 block w-full p-3 border border-gray-light rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
              >
                <option value="pending">معلق</option>
                <option value="accepted">مقبول</option>
                <option value="rejected">مرفوض</option>
              </select>
            </div>

            {status === "accepted" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right">التاريخ المقترح</label>
                <input
                  type="datetime-local"
                  value={formattedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  className="mt-2 block w-full p-3 border border-gray-light rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right">ملاحظات المعلم</label>
              <textarea
                value={teacherNotes}
                onChange={(e) => setTeacherNotes(e.target.value)}
                className="mt-2 block w-full p-3 border border-gray-light rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right resize-y min-h-[100px]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-300 to-blue-500 text-white rounded-lg font-semibold hover:from-blue-500 hover:to-blue-400 transition-all duration-300"
            >
              تحديث الحصة
            </button>
          </form>
          ):
          <CheckUploadForm session_id={sessionId}/>
          }
          
        </div>
      </div>
    </div>
  );
};

export default PrivateSessionDetail;