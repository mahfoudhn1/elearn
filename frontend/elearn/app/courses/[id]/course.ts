import axiosClientInstance from "../../lib/axiosInstance";
import { GroupCourse } from "../../types/student";

export async function fetchCourse(){
    try {
      const response = await axiosClientInstance.get<GroupCourse>(`/groups/courses/1/`, {

      });
      console.log(response.data);
      
      const courseData = {
        ...response.data,
        student_answers: response.data.student_answers || [], // Normalize to empty array
      };
    return courseData   
    } catch (err: any) {
        return err
    }
  };