'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { joinGroup } from '../../lib/groupsApi';
import { Group, Grade } from '../../types/student';

interface GroupsPerLevelProps {
  groupsCategories?: Group[];
  allGrades: Grade[];
  isStudent?: boolean;
  myGroupIds?: string[];
  context?: {
    schoolLevel?: string;
    grade?: string;
    field?: string;
    lang?: string;
  };
}

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const GroupCard = ({
  group,
  isStudent,
  isMember,
  isRequested,
  onOpen,
  onJoin,
}: {
  group: Group;
  isStudent: boolean;
  isMember: boolean;
  isRequested: boolean;
  onOpen: () => void;
  onJoin: () => void;
}) => (
  <div
    onClick={onOpen}
    className="group flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
  >
    <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-purple-600" />
    <div className="p-5 flex flex-col flex-1">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-800 leading-snug">
          {group.name}
        </h3>
        {isMember ? (
          <span className="shrink-0 text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
            منضم
          </span>
        ) : (
          <span className="shrink-0 text-xs font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
            {group.status === 'open' ? 'مفتوحة' : 'مغلقة'}
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-gray-500">
        {group.admin?.name || 'أستاذ'}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {group.field_of_study_nest && (
          <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">
            {group.field_of_study_nest}
          </span>
        )}
        {group.language && (
          <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full">
            {group.language}
            {group.language_level ? ` - ${group.language_level}` : ''}
          </span>
        )}
        {group.school_level && (
          <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
            {group.school_level}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
        <UsersIcon />
        <span>{group.students?.length ?? 0} طالب</span>
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100">
        {isStudent ? (
          <button
            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              isMember
                ? 'bg-green-50 text-green-700 cursor-default'
                : isRequested
                  ? 'bg-yellow-50 text-yellow-700 cursor-default'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            disabled={isMember || isRequested}
            onClick={(e) => {
              e.stopPropagation();
              if (!isMember && !isRequested) onJoin();
            }}
          >
            {isMember
              ? 'أنت عضو في هذه المجموعة'
              : isRequested
                ? 'تم إرسال الطلب'
                : 'انضم إلى المجموعة'}
          </button>
        ) : (
          <button
            className="w-full py-2.5 rounded-xl font-semibold text-sm bg-gray-900 text-white hover:bg-blue-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            إدارة المجموعة
          </button>
        )}
      </div>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      </svg>
    </div>
    <p className="text-gray-600 text-lg">لا توجد مجموعات متاحة حالياً.</p>
  </div>
);

const GroupsPerLevel = ({
  groupsCategories = [],
  allGrades,
  isStudent = false,
  myGroupIds = [],
  context = {},
}: GroupsPerLevelProps) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestedGroups, setRequestedGroups] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();

  const school_Level = searchParams.get('school_Level') ?? context.schoolLevel;
  const field = searchParams.get('field') ?? context.field;
  const grade = searchParams.get('grade') ?? context.grade;
  const lang = searchParams.get('lang') ?? context.lang;

  const handleCreatePage = () => {
    const params = new URLSearchParams();
    if (school_Level) params.set('school_Level', school_Level);
    if (grade) params.set('grade', grade);
    if (field) params.set('field', field);
    if (lang) params.set('lang', lang);
    const query = params.toString();
    router.push(`/groups/allgroups/create${query ? `?${query}` : ''}`);
  };

  const handleOpen = (id: string) => router.push(`/groups/allgroups/${id}`);

  const handleJoin = async (id: string) => {
    try {
      await joinGroup(id);
      setRequestedGroups((prev) => [...prev, id]);
      setErrorMessage(null);
    } catch (error: any) {
      console.error(error);
      const detail = error?.response?.data;
      setErrorMessage(
        typeof detail === 'string'
          ? detail
          : detail?.detail ||
              detail?.[0] ||
              'حدث خطأ أثناء محاولة الانضمام للمجموعة'
      );
    }
  };

  const academicGroups = groupsCategories.filter(
    (g) => g.group_type === 'ACADEMIC'
  );
  const languageGroups = groupsCategories.filter(
    (g) => g.group_type === 'LANGUAGE'
  );

  const academicSections = allGrades
    .map((g) => ({
      grade: g,
      groups: academicGroups.filter((group) => group.grade === g.id),
    }))
    .filter((section) => section.groups.length > 0);

  const languageLevels = Array.from(
    new Set(languageGroups.map((g) => g.language_level || 'غير محدد'))
  );
  const languageSections = languageLevels.map((level) => ({
    level,
    groups: languageGroups.filter(
      (group) => (group.language_level || 'غير محدد') === level
    ),
  }));

  const nothingToShow = academicSections.length === 0 && languageSections.length === 0;

  const selectedGradeName = grade
    ? allGrades.find((g) => g.id === grade)?.name
    : undefined;
  const selectedFieldName = academicGroups[0]?.field_of_study_nest;

  const headerSubtitle = lang
    ? 'المجموعات المتاحة لهذه اللغة'
    : selectedGradeName
      ? `${selectedGradeName}${selectedFieldName ? ` - ${selectedFieldName}` : ''}`
      : 'تصفح المجموعات حسب المستوى';

  const renderCard = (group: Group) => (
    <GroupCard
      key={group.id}
      group={group}
      isStudent={isStudent}
      isMember={myGroupIds.includes(group.id)}
      isRequested={requestedGroups.includes(group.id)}
      onOpen={() => handleOpen(group.id)}
      onJoin={() => handleJoin(group.id)}
    />
  );

  return (
    <div className="min-h-screen bg-stone-50 px-4 md:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              كل المجموعات المتاحة
            </h1>
            <p className="text-gray-500 mt-1">{headerSubtitle}</p>
          </div>
          {!isStudent && (
            <button
              onClick={handleCreatePage}
              className="self-start md:self-auto bg-gray-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              + إنشاء مجموعة
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        {nothingToShow && <EmptyState />}

        {academicSections.map(({ grade: sectionGrade, groups }) => (
          <section key={sectionGrade.id} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {sectionGrade.name}
              </h2>
              <span className="text-xs text-gray-400">
                {groups.length} مجموعة
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {groups.map(renderCard)}
            </div>
          </section>
        ))}

        {languageSections.map(({ level, groups }) => (
          <section key={level} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                مستوى {level}
              </h2>
              <span className="text-xs text-gray-400">
                {groups.length} مجموعة
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {groups.map(renderCard)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default GroupsPerLevel;
