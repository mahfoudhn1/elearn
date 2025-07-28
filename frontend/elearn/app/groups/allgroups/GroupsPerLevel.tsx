'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import axiosInstance from '../../lib/axiosInstance';
import { Group, Grade } from '../../types/student';

interface GroupsPerLevelProps {
  groupsCategories?: Group[];
  allGrades: Grade[];
}

const GroupsPerLevel = ({ groupsCategories = [], allGrades }: GroupsPerLevelProps) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const user = useSelector((state: RootState) => state.auth.user);
  const searchParams = useSearchParams();
  const school_Level = searchParams.get('school_Level');
  const field = searchParams.get('field');
  const router = useRouter();

  const handleCreatePage = () => {
    if (field) {
      router.push(`/groups/allgroups/create/?field=${field}&school_Level=${school_Level}`);
    } else {
      router.push(`/groups/allgroups/create/?school_Level=${school_Level}`);
    }
  };

  const handleGroup = (id: number) => {
    router.push(`/groups/allgroups/${id}`);
  };

  const handleJoin = async (id: number) => {
    try {
      await axiosInstance.post('groups/student-requests/', { group_id: id });
    } catch (error: any) {
      console.error(error);
      setErrorMessage('حدث خطأ أثناء محاولة الانضمام للمجموعة');
    }
  };
  console.log(groupsCategories);
  
  // Group academic groups by grade
  const groupedByGrade = allGrades.reduce<Record<string, { gradeName: string; groups: Group[] }>>((acc, grade) => {
    const gradeGroups = groupsCategories.filter(
      (group) => group.grade === grade.id && group.group_type === 'ACADEMIC'
    );
    acc[grade.id] = {
      gradeName: grade.name,
      groups: gradeGroups,
    };
    return acc;
  }, {});

  // Group language groups by language level
  const uniqueLanguageLevels = Array.from(
    new Set(
      groupsCategories
        .filter((group) => group.group_type === 'LANGUAGE' && group.language_level)
        .map((group) => group.language_level)
    )
  );

  const groupedByLanguageLevel = uniqueLanguageLevels.reduce<
    Record<string, { levelName: string; groups: Group[] }>
  >((acc, levelName) => {
    const levelGroups = groupsCategories.filter(
      (group) => group.group_type === 'LANGUAGE' && group.language_level === levelName
    );
    acc[levelName] = {
      levelName,
      groups: levelGroups,
    };
    return acc;
  }, {});

  return (
    <div className="flex flex-col bg-stone-50 min-h-screen">
      <div className="p-6 flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-gray-dark text-2xl font-semibold">كل المجموعات المتاحة</h1>
        <button
          className="border border-gray py-2 px-4 rounded-lg text-gray hover:bg-gray-dark hover:text-white mt-4 md:mt-0"
          onClick={handleCreatePage}
        >
          انشاء مجموعة +
        </button>
      </div>

      {/* Academic Groups by Grade */}
      {Object.entries(groupedByGrade).map(([gradeId, { gradeName, groups }]) => (
        <div key={gradeId} className="mb-8">
          <h2 className="text-xl font-bold mb-4 px-6">{gradeName}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => handleGroup(group.id)}
                className="bg-white rounded-xl p-6 shadow hover:border-purple cursor-pointer transition"
              >
                <div className="flex flex-col justify-between items-center text-center">
                  <h3 className="text-xl font-semibold text-gray-700">{group.name}</h3>
                  <p className="text-sm mt-2 text-sky-400 font-semibold">عدد الطلبة: {group.students?.length ?? 0}</p>
                  <p className="mt-2 text-gray-600">{group.school_level}</p>
                  {user?.role === 'student' && (
                    <button
                      className="mt-4 px-4 py-2 border border-gray-800 rounded-lg hover:bg-gray-800 hover:text-white transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoin(group.id);
                      }}
                    >
                      انضمام
                    </button>
                  )}
                  {errorMessage && <p className="text-red-500 mt-2">{errorMessage}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}


      {Object.entries(groupedByLanguageLevel).map(([levelName, { levelName: displayName, groups }]) => (
        <div key={levelName} className="mb-8">
          <h2 className="text-xl font-bold mb-4 px-6">مجموعات المستوى {displayName}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => handleGroup(group.id)}
                className="bg-white rounded-xl p-6 shadow hover:border-purple cursor-pointer transition"
              >
                <div className="flex flex-col justify-between items-center text-center">
                  <h3 className="text-xl font-semibold text-gray-700">{group.name}</h3>
                  <p className="text-sm mt-2 text-sky-400 font-semibold">عدد الطلبة: {group.students?.length ?? 0}</p>
                  <p className="mt-2 text-gray-600">{group.language_level}</p>
                  {user?.role === 'student' && (
                    <button
                      className="mt-4 px-4 py-2 border border-gray-800 rounded-lg hover:bg-gray-800 hover:text-white transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoin(group.id);
                      }}
                    >
                      انضمام
                    </button>
                  )}
                  {errorMessage && <p className="text-red-500 mt-2">{errorMessage}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GroupsPerLevel;
