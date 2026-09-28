import { useParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import axiosClientInstance from '../../../lib/axiosInstance';
import { Student } from '../../../types/student';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faX } from '@fortawesome/free-solid-svg-icons';

interface PopupStudentsProps {
  onClose: () => void;
}

const PopupStudents: React.FC<PopupStudentsProps> = ({ onClose }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [addedStudentIds, setAddedStudentIds] = useState<string[]>([]);

  const params = useParams();
  const group_id = String(params.id);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await axiosClientInstance.get(`/groups/Noroup_students/`, { params: { group_id } });
        if (response.data) {
          setStudents(response.data);
          setFilteredStudents(response.data);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };
    fetchStudents();
  }, [group_id]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value.toLowerCase();
    setSearchTerm(searchValue);

    const filtered = students.filter(student =>
      student.user.first_name.toLowerCase().includes(searchValue)
    );
    setFilteredStudents(filtered);
  };

  const handleAdd = async (student_id: string, group_id: string) => {
    try {
      const res = await axiosClientInstance.post(`groups/${group_id}/add_student_to_group/`, {
        student_id,
      });
      if (res) {
        setAddedStudentIds((prev) => [...prev, student_id]);
      }
    } catch (error) {
      console.error('Error adding student:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">إضافة طالب</h2>
            <button
              className="text-gray hover:text-gray-700 transition-colors"
              onClick={onClose}
            >
              <FontAwesomeIcon icon={faX} className="w-5 h-5" />
            </button>
          </div>

          {/* Description */}
          <p className="text-gray-700 mb-4">
            يمكنك إضافة الطلبة المشتركين الذين لم يتمكنوا من الحصول على مجموعة بعد.
          </p>

          {/* Search Input */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="ابحث عن طالب"
              value={searchTerm}
              onChange={handleSearch}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Students List */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">طلبة بدون مجموعة</h3>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <img
                      src={`${student.user.avatar_file}`}
                      alt={student.user.first_name}
                      className="w-8 h-8 rounded-full ml-3"
                    />
                    <div>
                      <p className="font-medium text-gray-800">{student.user.first_name}</p>
                      <p className="text-sm text-gray-500">{student.wilaya}</p>
                    </div>
                  </div>
                  {addedStudentIds.includes(student.id) ? (
                    <div className="text-sm text-orange-600 flex items-center">
                      <FontAwesomeIcon icon={faCheck} className="mr-1" />
                      تمت الإضافة
                    </div>
                  ) : (
                    <button
                      className="text-sm text-white bg-orange-600 rounded-lg px-3 py-1 hover:bg-orange transition-colors"
                      onClick={() => handleAdd(student.id, group_id)}
                    >
                      إضافة
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-700 text-center">لا توجد نتائج</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopupStudents;