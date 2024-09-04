'use client';

import { useEffect, useState } from 'react';

import axiosInstance from '../../../store/axiosInstance';
import Sidebar from '../../components/dahsboardcomponents/sidebar';
import Navbar from '../../components/dahsboardcomponents/navbar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDownWideShort } from '@fortawesome/free-solid-svg-icons';

interface GroupsPerLevelProps {
  params: {
    id: number;
  };
}
interface Schedule {
  day_of_week: string;
  start_time: string;
  end_time: string;
}
interface Student {
  first_name: string;
  last_name: string;
  phone_number: string;
  avatar: string;
  wilaya: string;
  school_level: string;
  hightschool_speciality: string;
}

interface Group {
  id: number;
  name: string;
  school_level: string;
  grade: string;
  schedule?: Schedule[];
  students?: Student[];
}

interface GroupsListProps {
  groups: Group[];
}

const GroupsPerLevel = ({ params }: GroupsPerLevelProps) => {
  const [groupsCategories, setGroupsCategories] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openGroupId, setOpenGroupId] = useState<number | null>(null);

  const field_of_study_id = params.id;

  useEffect(() => {
    const fetchGroups = () => {
      axiosInstance
        .get(`/groups/?field_of_study=${field_of_study_id}`)
        .then((response) => {
          setGroupsCategories(response.data);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching groups:', error);
          setError('Failed to fetch groups.');
          setLoading(false);
        });
    };

    fetchGroups();
  }, [field_of_study_id]);


  console.log(groupsCategories);
  
  const HandelDropdown = (groupId: number) => {
    setOpenGroupId((prevId) => (prevId === groupId ? null : groupId));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="flex flex-row bg-stone-50">
      <Sidebar />
      <div className="flex flex-col w-full">
        <Navbar />
        <div className="p-4">
          <div>
            <h1 className="text-center text-gray-dark text-2xl font-semibold">كل مجموعات التخصص</h1>
          </div>
          <ul>
            {groupsCategories.map((group) => (
              <li key={group.id}>
                <div className="max-w-md flex-col cursor-pointer mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl m-5">
                  <div className="p-8 flex">
                    <div className="pl-4">
                      <p className="md:text-4xl text-lg font-bold text-gray-700"> {group.name} </p>
                    </div>
                    <div>
                      <div className="uppercase tracking-wide text-sm text-sky-400 font-semibold">
                        {' '}
                        عدد الطلبة : {group.students?.length ?? 0}{' '}
                      </div>
                      <p className="mt-2 text-gray"> {group.grade} </p>
                      <p className="mt-2 text-gray"> {group.school_level} </p>
                    </div>
                  </div>
                  {openGroupId === group.id && (
                  <div className="p-4">
                    <h2 className="text-lg font-semibold text-gray-800 ">التوقيت الأسبوعي</h2>
                    <ul>
                      {group.schedule && group.schedule.length > 0 ? (
                        group.schedule.map((schedule, index) => (
                          <li key={index} className="mt-2 text-gray-600">
                            <span className="font-medium text-gray ">{schedule.day_of_week}: </span>
                            {schedule.start_time} - {schedule.end_time}
                          </li>
                        ))
                      ) : (
                        <p className="text-gray-500">No schedule available.</p>
                      )}
                    </ul>
                  </div>
                )}

                  <div
                    className="flex flex-row justify-center bg-gray bg-opacity-30 items-center mx-auto p-1"
                    onClick={() => HandelDropdown(group.id)}
                  >
                    <p className="text-center text-gray ">
                      {' '}
                      التوقيت الاسبوعي
                      <span>
                        {' '}
                        <FontAwesomeIcon className=" " icon={faArrowDownWideShort} />
                      </span>
                    </p>
                  </div>
                </div>

              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GroupsPerLevel;
