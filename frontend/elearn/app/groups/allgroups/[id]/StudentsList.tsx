"use client";
import React, { useEffect, useState } from "react";
import axiosClientInstance from "../../../lib/axiosInstance";
import { useParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import PopupStudents from "./PopupStudents";
import { Student, Subscription } from "../../../types/student";
import { useSelector } from "react-redux";
import { RootState } from "../../../../store/store";
import { Plus } from "lucide-react";

interface StudentsListProps {
  studentlist: Student[];
  refreshData: () => void;
}
function StudentsList({ studentlist, refreshData }: StudentsListProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isPopupVisible, setPopupVisible] = useState(false);
  const params = useParams();
  const user = useSelector((state: RootState) => state.auth.user);
  const router = useRouter();

  useEffect(() => {
    if (user?.role === "teacher" && studentlist.length > 0) {
      const fetchSubscriptions = async () => {
        try {
          const studentIds = studentlist.map((student) => student.id);
          const response = await axiosClientInstance.post(
            "/subscriptions/subscriptions/filtered_subscribed_students/",
            { student_ids: studentIds }
          );
          if (response) {
            console.log(response.data);
            
            setSubscriptions(response.data);
          } else {
            console.error("Failed to fetch subscriptions");
          }
        } catch (error) {
          console.error("Error fetching subscriptions:", error);
        }
      };
      fetchSubscriptions();
    }
  }, [studentlist, user]);

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm("هل أنت متأكد أنك تريد حذف هذا الطالب؟");
    if (!confirmDelete) return;
  
    const group_id = String(params.id);
    try {
      await axiosClientInstance.delete(`groups/${group_id}/remove_student/`, {
        data: { student_id: id },
      });
      alert("تم حذف الطالب بنجاح");
      refreshData();
      router.refresh(); // Refresh the page to reflect changes
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("فشل حذف الطالب");
    }
  };
  

  // Handle popup visibility
  const handleOpenPopup = () => setPopupVisible(true);
  const handleClosePopup = () => setPopupVisible(false);

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-8 sm:px-8">
      {/* Popup for adding students */}
      {isPopupVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="relative w-full max-w-lg bg-white p-6 rounded-lg shadow-lg">
            <PopupStudents onClose={handleClosePopup} />
          </div>
        </div>
      )}

      {/* Table Header */}
      <div className="flex items-center justify-between pb-6">
        {user?.role !== "student" && (
          <div className="flex justify-end mb-4">
          <button
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
            onClick={() => setPopupVisible(true)}
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            <span>اضافة طالب</span>
          </button>
        </div>
        )}
      </div>

      {/* Students Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-light shadow-sm">
        <table className="min-w-full divide-y divide-gray-light">
          <thead className="bg-gray-50">
            <tr>
  
              <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-grey-900">
                الاسم الكامل
              </th>
              {user?.role !== "student" && (
                <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-grey-900">
                  الاشتراك
                </th>
              )}
              <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-grey-900">
                الولاية
              </th>
              {user?.role !== "student" && (
                <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-grey-900">
                  الإجراءات
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {studentlist?.map((student) => (
              <tr key={student.id} className="hover:bg-gray-light transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img
                      className="h-10 w-10 mx-2 rounded-full"
                      src={`${student.user.avatar?.startsWith('/api/media/https%3A/lh3')
                        ? decodeURIComponent(student.user.avatar.replace('/api/media/', '')).replace(/^https:\//, 'https://')
                        : student.user.avatar_file}`}
                      alt={`${student.user.first_name} ${student.user.last_name}`}
                    />
                    <div className="mr-4">
                      <div className="text-sm font-medium text-grey-900">
                        {student.user.first_name} {student.user.last_name}
                      </div>
                    </div>
                  </div>
                </td>
                {user?.role !== "student" && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {subscriptions.find((s) => s.student.id === student.id)?.is_active ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-green text-white rounded-full">
                        نشط
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
                        غير نشط
                      </span>
                    )}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {student.wilaya}
                </td>
                {user?.role !== "student" && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      className="text-red-500 hover:text-red-800 transition-colors"
                      onClick={() => handleDelete(student.id)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StudentsList;