import { useParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import axiosClientInstance from '../../../lib/axiosInstance';
import { Student } from '../../../types/student';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faX } from '@fortawesome/free-solid-svg-icons';

interface PopupStudentsProps {
    onClose: () => void;
  }

const PopupStudents:React.FC<PopupStudentsProps> = ({onClose})=>{
    const [students, setStudents] = useState<Student[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>(''); // State to store search input
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]); // State for filtered students
    const [isAdded, setIsAdded] = useState<Boolean>(false)

    const params = useParams();
    const group_id = Number(params.groupId);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const response = await axiosClientInstance.get(`/groups/Noroup_students/`, { params: { group_id } });
                if (response.data) {
                    setStudents(response.data);
                    setFilteredStudents(response.data); 
                }
            } catch (error) {
                console.log(error);
            }
        };
        fetchStudents();
    }, [group_id]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const searchValue = e.target.value.toLowerCase();
        setSearchTerm(searchValue);

        const filtered = students.filter(student =>
            student.first_name.toLowerCase().includes(searchValue) 
        );
        setFilteredStudents(filtered);
    };

    const handleAdd = async(student_id:number, group_id:number)=>{
        try{
          const res = await axiosClientInstance.post(`groups/${group_id}/add_student_to_group/`,{
            student_id
          })
          if(res){
            setIsAdded(true)
          }
        }catch(error){
          console.log(error);
          
        }
    }
    return (
        <div className="flex items-center justify-center  ">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">اضافة طالب</h2>
              <button className="border border-gray-700 rounded-full h-10 w-10 p-2 hover:text-gray-700"
              onClick={onClose} 
              >
                <FontAwesomeIcon icon={faX} />
              </button>
            </div>
            
            <p className="text-gray mb-4">
              يمكنك أضافة الطلبة المشتريكن الذي لازال لم يمكنهم الحصول على مجموعة
            </p>
            
            <div className="flex mb-4">
              <input
                type="text"
                placeholder="ابحث عن طالب"
                value={searchTerm}
                onChange={handleSearch}
                className="flex-grow border border-gray rounded-l-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">طلبة بدون مجموعة</h3>
              {filteredStudents.map((student, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <img src={`http://localhost:8000/${student.avatar}`} alt={student.first_name} className="w-8 h-8 rounded-full ml-3" />
                    <div>
                      <p className="font-medium">{student.first_name}</p>
                      <p className="text-sm text-gray">{student.wilaya}</p>
                    </div>
                  </div>
                  {isAdded ?  
                      <div className="text-sm  rounded-lg px-2 py-1 bg-white text-gray-light"
                      
                    >
                      <FontAwesomeIcon icon={faCheck} />
                      تم الاضافة
                    </div>
                  : 
                  
                  <button className="text-sm border rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={()=>handleAdd(student.id, group_id)}
                  >
                    اضافة
                  </button>
                  }
                </div>
              ))}
            </div>
 
          </div>
        </div>
      </div>
    );
}

export default PopupStudents;
