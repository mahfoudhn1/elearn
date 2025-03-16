import axiosClientInstance from "../lib/axiosInstance";

export async function fetchGradesBySchoolLevel(schoolLevel:any) {
    try {
      const response = await axiosClientInstance.get("/grades/", {
        params: { school_level: schoolLevel },
      });
      return response.data; // Returns list of grades
    } catch (error:any) {
      console.error("Error fetching grades:", error);
      throw new Error(error.response?.data?.message || "Failed to fetch grades");
    }
  }