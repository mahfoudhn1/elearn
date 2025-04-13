import React, { useState } from 'react';
import { Subscription } from '../../types/student';
import Link from 'next/link';


interface StudentTablesProps {
    studentSubcriptions: Subscription[];
}

function teacherTable({ studentSubcriptions }: StudentTablesProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

  const filteredSubscriptions = studentSubcriptions.filter((sub) =>
    sub.teacher.user.first_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalItems = filteredSubscriptions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSubscriptions = filteredSubscriptions.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="w-full mx-auto p-4">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header with Search Bar */}
        <div className="p-6 border-b border-gray-light flex flex-row justify-between items-center">
          <h6 className="text-xl font-semibold text-gray-800">قائمة اشتراكاتكم</h6>
          <input
            type="text"
            placeholder="ابحث بالاسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 px-4 py-2"
          />
        </div>

        {/* Table */}
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-light">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-dark uppercase tracking-wider">
                    الاسم الكامل
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-dark uppercase tracking-wider">
                    التخصص
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-dark uppercase tracking-wider">
                    الاشتراك
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-dark uppercase tracking-wider">
                    تاريخ التسجيل
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-dark uppercase tracking-wider">
                    تاريخ انتهاء 
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-light">
                {currentSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-light transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <img
                            src={`${sub.teacher.user.avatar_file}`}
                            className="h-10 w-10 rounded-full"
                            alt={sub.teacher.user.first_name}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {sub.teacher.user.first_name} {sub.teacher.user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {/* {sub.teacher.grade.school_level || 'غير محدد'} */}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{sub.teacher.teaching_subjects}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            sub.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {sub.is_active ? 'جارية' : 'متوقفة'}
                        </span>
                        <Link
                          href={`/subscriptions/${sub.id}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          اضغط لتفاصيل
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm text-gray-800">
                        {new Date(sub.start_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm text-gray-800">
                        {new Date(sub.end_date).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalItems > itemsPerPage && (
            <div className="flex justify-between items-center mt-4 px-6 py-3 border-t border-gray-light">
              <div className="text-sm text-gray-700">
                عرض {startIndex + 1} إلى {Math.min(endIndex, totalItems)} من أصل {totalItems} اشتراك
              </div>
              <div className="flex gap-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  السابق
                </button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  صفحة {currentPage} من {totalPages}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default teacherTable;