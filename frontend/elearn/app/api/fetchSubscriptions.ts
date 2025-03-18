import axiosClientInstance from "../lib/axiosInstance";

export async function fetchTeacherSubscriptions() {
    try {
      const response = await axiosClientInstance.get("/subscriptions/subscriptions/teacher_subscriptions/");
      return response.data;
    } catch (error:any) {
      console.error("Error fetching teacher subscriptions:", error);
      throw new Error(error.response?.data?.message || "Failed to fetch teacher subscriptions");
    }
  }
  export async function fetchStudents(){
    try{
      const res = await axiosClientInstance.get('/subscriptions/subscriptions/subscribed_students/')
      return res.data
    }catch(error:any){
      console.error("Error fetching teacher subscriptions:", error);
      throw new Error(error.response?.data?.message || "Failed to fetch teacher subscriptions");

    }
    
  };

  // Fetch subscriptions for a student (subscriptions endpoint)
  export async function fetchStudentSubscriptions() {
    try {
      const response = await axiosClientInstance.get("/subscriptions/subscriptions/");
      return response.data; 
    } catch (error:any) {
      console.error("Error fetching student subscriptions:", error);
      throw new Error(error.response?.data?.message || "Failed to fetch student subscriptions");
    }
  }