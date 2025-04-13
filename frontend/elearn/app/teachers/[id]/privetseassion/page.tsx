"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import axiosClientInstance from "../../../lib/axiosInstance";

const CreatePrivateSessionRequest = () => {
  const params = useParams();
  const teacher_id = params.id; // Get teacher_id from the URL

  const [studentNotes, setStudentNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teacher_id || !studentNotes.trim()) {
      setError("يرجى ملء جميع الحقول.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await axiosClientInstance.post(
        "/privet/session-requests/create/",
        {
          teacher_id: teacher_id,
          student_notes: studentNotes,
        }
      );

      if (response.status === 201) {
        setSuccess(true);
        setStudentNotes("");
      }
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-100 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
          طلب حصة خاصة
        </h1>

        {success && (
          <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-xl mb-6">
            تم إرسال طلبك بنجاح! سيتم التواصل معك قريبًا.
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="studentNotes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              ملاحظات للأستاذ
            </label>
            <textarea
              id="studentNotes"
              value={studentNotes}
              onChange={(e) => setStudentNotes(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-200 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50"
              rows={5}
              placeholder="أدخل ملاحظاتك هنا (مثال: المواضيع المطلوبة، التوقيت المفضل...)"
              required
            />
          </div>

          <div className="flex justify-start">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "جارٍ الإرسال..." : "إرسال الطلب"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePrivateSessionRequest;