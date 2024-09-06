import axiosInstance from '../../../store/axiosInstance';
import GroupsPerLevel from './GroupsPerLevel';
import { cookies } from 'next/headers';

interface Params {
  id: string;
}

async function getData(field_of_study_id: number) {
  const cookieStore = cookies();
  const authToken = cookieStore.get('access_token')?.value;  
  console.log(authToken);
  
  const response = await axiosInstance.get(`/groups/?field_of_study=${field_of_study_id}`,{
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });
  console.log(response);
  
  return response.data;
}

export default async function GroupsPage({ params }: { params: Params }) {
  const groupsCategories = await getData(Number(params.id)); 

  return <GroupsPerLevel groupsCategories={groupsCategories} />;
}
