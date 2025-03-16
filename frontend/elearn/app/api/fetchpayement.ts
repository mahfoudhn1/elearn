import axiosClientInstance from "../lib/axiosInstance";

// Fetch payment data for the authenticated teacher
export async function fetchTeacherPayments() {
  try {
    const response = await axiosClientInstance.get("/payments/");    
    return response.data; // Returns the payment object (current_balance, total_earned, etc.)
  } catch (error:any) {
    console.error("Error fetching teacher payments:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch payment data");
  }
}

// Fetch monthly earnings for a specific year and month
export async function fetchMonthlyEarnings(year:any, month:any) {
  try {
    const response = await axiosClientInstance.get("/payments/monthly_earnings/", {
      params: { year, month },
    });
    return response.data;
  } catch (error:any) {
    console.error("Error fetching monthly earnings:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch monthly earnings");
  }
}