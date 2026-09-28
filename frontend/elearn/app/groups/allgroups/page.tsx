import { cookies } from 'next/headers';
import GroupsPerLevel from './GroupsPerLevel';
import StudentGroups from './StudentGroups';
import { createAxiosSSRInstance } from '../../lib/axiosServer';

interface SearchParams {
  field?: string;
  lang?: string;
  school_Level: string;
}

// Data fetch helpers — now each one gets its own fresh axios instance
async function getData({
  field_of_study_id,
  school_level,
  lang,
}: {
  field_of_study_id?: number;
  school_level: string;
  lang?: string;
}) {
  const axiosSSRInstance = createAxiosSSRInstance();

  if (field_of_study_id) {
    const res = await axiosSSRInstance.get(
      `/groups/?school_level=${encodeURIComponent(school_level)}&field_of_study=${field_of_study_id}`
    );
    return res.data;
  }

  if (lang) {
    const res = await axiosSSRInstance.get(
      `/groups/?school_level=${encodeURIComponent(school_level)}&language_name=${encodeURIComponent(lang)}`
    );
    return res.data;
  }

  const res = await axiosSSRInstance.get(
    `/groups/?school_level=${encodeURIComponent(school_level)}`
  );
  return res.data;
}

async function getGrades(school_level: string) {
  const axiosSSRInstance = createAxiosSSRInstance();
  const res = await axiosSSRInstance.get(`/grades/?school_level=${encodeURIComponent(school_level)}`);
  return res.data;
}

async function getUserRole() {
  const axiosSSRInstance = createAxiosSSRInstance();
  const res = await axiosSSRInstance.get('/users/');
  return res.data[0].role;
}

async function getStudentGroups() {
  const axiosSSRInstance = createAxiosSSRInstance();
  const res = await axiosSSRInstance.get('/groups/student_groups/');
  return res.data;
}

export default async function GroupsPage({ searchParams }: { searchParams: SearchParams }) {
  try {
    const field = searchParams.field ? Number(searchParams.field) : undefined;
    const lang = searchParams.lang || undefined;
    const schoolLevel = searchParams.school_Level || "ثانوي";

    const userRole = await getUserRole();
    console.log('User role:', userRole);

    if (userRole === 'student') {
      const studentGroups = await getStudentGroups();
      return <StudentGroups groups={studentGroups} />;
    }

    const groupsCategories = await getData({
      field_of_study_id: field,
      school_level: schoolLevel,
      lang: lang,
    });

    const allGrades = await getGrades(schoolLevel);

    return <GroupsPerLevel groupsCategories={groupsCategories} allGrades={allGrades} />;
  } catch (error) {
    console.error('Error loading data in GroupsPage:', error);
    return <p>Error loading data.</p>;
  }
}
