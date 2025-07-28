import { cookies } from 'next/headers'; 
import GroupsPerLevel from './GroupsPerLevel';
import axiosSSRInstance from '../../lib/axiosServer';

import StudentGroups from './StudentGroups'

interface SearchParams {
  field?: string;
  lang?: string;
  school_Level: string;
}


async function getData({
  field_of_study_id,
  school_level,
  lang,
}: {
  field_of_study_id?: number;
  school_level: string;
  lang?: string;
}) {
  try {
    if (field_of_study_id) {
      const response = await axiosSSRInstance.get(
        `/groups/?school_level=${encodeURIComponent(school_level)}&field_of_study=${field_of_study_id}`
      );
      return response.data;
    }

    if (lang) {
      const response = await axiosSSRInstance.get(
        `/groups/?school_level=${encodeURIComponent(school_level)}&language_name=${encodeURIComponent(lang)}`
      );
      console.log(response.data);
      
      return response.data;
    }

    const response = await axiosSSRInstance.get(
      `/groups/?school_level=${encodeURIComponent(school_level)}`
    );
    return response.data;

  } catch (error) {
    console.error('Error fetching group data:', error);
    throw new Error('Failed to fetch group data.');
  }
}



async function getGrades(school_level:string) {
  const cookieStore = cookies();
  const authToken = cookieStore.get('access_token')?.value;

  try {
    const response = await axiosSSRInstance.get(`/grades/?school_level=${school_level}`);
    
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

async function getUserRole() {
  const cookieStore = cookies();
  const authToken = cookieStore.get('access_token')?.value;
  
  try {
    const response = await axiosSSRInstance.get('/users/');

    console.log(response.data);
    
    return response.data[0].role;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}
async function getStudentGroups() {
  try {
    const response = await axiosSSRInstance.get('/groups/student_groups/');
    return response.data;
  } catch (error) {
    console.error('Error fetching student groups:', error);
    return [];
  }
}

export default async function GroupsPage({ searchParams }: { searchParams: SearchParams }) {
  try {
    
    const field = searchParams.field ? Number(searchParams.field) : undefined;
    const lang = searchParams.lang || undefined;
    const schoolLevel = searchParams.school_Level || "ثانوي";
    const userRole = await getUserRole(); 
    console.log(userRole);
    
    if (userRole == 'student') {
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
    return <p>Error loading data.</p>;
  }
}


