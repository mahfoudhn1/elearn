import { cookies } from 'next/headers'; 
import GroupsPerLevel from './GroupsPerLevel';
import axiosSSRInstance from '../../lib/axiosServer';



interface Params {
  id: string;
}

async function getData(field_of_study_id: number) {
  const cookieStore = cookies();
  const authToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;
  
  try {
    const response = await axiosSSRInstance.get(`/groups/?field_of_study=${field_of_study_id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching group data:', error);
    throw new Error('Failed to fetch group data.');
  }
}

async function getGrades(school_level = 1) {
  const cookieStore = cookies();
  const authToken = cookieStore.get('access_token')?.value;

  try {
    const response = await axiosSSRInstance.get(`/groups/grades/?school_level=${school_level}`);
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

export default async function GroupsPage({ params }: { params: Params }) {
  try {
    const field_of_study_id = Number(params.id);
    const groupsCategories = await getData(field_of_study_id);
    const allGrades = await getGrades();

    return (
      <GroupsPerLevel groupsCategories={groupsCategories} allGrades={allGrades} />
    );
  } catch (error) {
    return <p>Error loading groups or grades data.</p>;  // Error UI can be more descriptive
  }
}
