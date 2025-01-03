import { cookies } from 'next/headers'; 
import GroupsPerLevel from './GroupsPerLevel';
import axiosSSRInstance from '../../lib/axiosServer';



interface SearchParams {
  field?: string;
  school_Level?: string;
}


async function getData(field_of_study_id?: number, school_level?: string) {
  const cookieStore = cookies();
  const authToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;
  
  try {
    if (field_of_study_id) {
      const response = await axiosSSRInstance.get(`/groups/?school_level=${school_level}&?field_of_study=${field_of_study_id}`);
      return response.data;
    } else if (school_level) {
      const response = await axiosSSRInstance.get(`/groups/?school_level=${school_level}`);
      console.log(response.data);
      return response.data;
    }
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

export default async function GroupsPage({searchParams}: {searchParams:SearchParams}) {
  try {
    const field = searchParams.field ? Number(searchParams.field) : undefined;

    const schoolLevel = searchParams.school_Level || "ثانوي";
    const groupsCategories = await getData(field, schoolLevel);
    const allGrades = await getGrades(schoolLevel);

    return (
      <GroupsPerLevel groupsCategories={groupsCategories} allGrades={allGrades} />
    );
  } catch (error) {
    return <p>Error loading data.</p>;
  }
}
