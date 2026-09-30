import GroupsPerLevel from './GroupsPerLevel';
import {
  fetchCurrentUserSSR,
  fetchGradesSSR,
  fetchGroupsSSR,
  fetchStudentGroupsSSR,
} from '../../lib/groupsApiServer';

interface SearchParams {
  field?: string;
  lang?: string;
  grade?: string;
  school_Level?: string;
}

export default async function GroupsPage({ searchParams }: { searchParams: SearchParams }) {
  const schoolLevel = searchParams.school_Level || 'ثانوي';
  const field = searchParams.field;
  const grade = searchParams.grade;
  const lang = searchParams.lang;

  try {
    const user = await fetchCurrentUserSSR();
    const isStudent = user?.role === 'student';
    const isLanguage = Boolean(lang);

    const filters = isLanguage
      ? { languageName: lang }
      : { schoolLevel, grade, fieldOfStudy: field };

    const [groups, grades, myGroups] = await Promise.all([
      fetchGroupsSSR(filters),
      isLanguage ? Promise.resolve([]) : fetchGradesSSR(schoolLevel),
      isStudent ? fetchStudentGroupsSSR() : Promise.resolve([]),
    ]);

    return (
      <GroupsPerLevel
        groupsCategories={groups}
        allGrades={grades}
        isStudent={isStudent}
        myGroupIds={myGroups.map((group) => group.id)}
        context={{ schoolLevel, grade, field, lang }}
      />
    );
  } catch (error) {
    console.error('Error loading data in GroupsPage:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <p className="text-gray-600">تعذر تحميل المجموعات. حاول مرة أخرى.</p>
      </div>
    );
  }
}
