import { cookies } from 'next/headers'; 
import axiosInstance from '../../../store/axiosInstance';
import GroupsPerLevel from './GroupsPerLevel';



interface Params {
  id: string;
}

async function getData(field_of_study_id: number) {
  const cookieStore = cookies();
  const authToken = cookieStore.get('access_token')?.value;

  try {
    const response = await axiosInstance.get(`/groups/?field_of_study=${field_of_study_id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
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
    const response = await axiosInstance.get(`/groups/grades/?school_level=${school_level}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching grades:', error);
    throw new Error('Failed to fetch grades.');
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
