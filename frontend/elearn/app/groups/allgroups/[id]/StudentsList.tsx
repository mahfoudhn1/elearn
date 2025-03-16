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

interface StudentsListProps {
  studentlist: Student[];
}

function StudentsList({ studentlist }: StudentsListProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isPopupVisible, setPopupVisible] = useState(false);
  const params = useParams();
  const user = useSelector((state: RootState) => state.auth.user);
  const router = useRouter();

  // Fetch subscriptions for students
  useEffect(() => {
    if (user?.role === "teacher" && studentlist.length > 0) {
      const fetchSubscriptions = async () => {
        try {
          const studentIds = studentlist.map((student) => student.id);
          const response = await axiosClientInstance.post(
            "/subscriptions/filtered_subscribed_students/",
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

  const handleDelete = async (id: number) => {
    const group_id = Number(params.groupId);
    try {
      await axiosClientInstance.delete(`groups/${group_id}/remove_student/`, {
        data: { student_id: id },
      });
      alert("تم حذف الطالب بنجاح");
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
        <h2 className="text-2xl font-semibold text-gray-800">أعضاء المجموعة</h2>
        {user?.role !== "student" && (
          <button
            className="flex items-center gap-2 rounded-md bg-blue-400 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 transition-colors"
            onClick={handleOpenPopup}
          >
            <FontAwesomeIcon icon={faPlus} />
            اضافة أعضاء
          </button>
        )}
      </div>

      {/* Students Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-light shadow-sm">
        <table className="min-w-full divide-y divide-gray-light">
          <thead className="bg-sky-400">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                الاسم الكامل
              </th>
              {user?.role !== "student" && (
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                  الاشتراك
                </th>
              )}
              <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                الولاية
              </th>
              {user?.role !== "student" && (
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                  الإجراءات
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {studentlist?.map((student) => (
              <tr key={student.id} className="hover:bg-gray-light transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {student.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img
                      className="h-10 w-10 mx-2 rounded-full"
                      src={`${student.user.avatar_file}`}
                      alt={`${student.user.first_name} ${student.user.last_name}`}
                    />
                    <div className="mr-4">
                      <div className="text-sm font-medium text-gray-dark">
                        {student.user.first_name} {student.user.last_name}
                      </div>
                    </div>
                  </div>
                </td>
                {user?.role !== "student" && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {subscriptions.find((s) => s.student.id === student.id)?.is_active ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
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