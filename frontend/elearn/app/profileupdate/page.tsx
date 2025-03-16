"use client"
import React, { useEffect, useState } from "react";
import TeacherForm from "./TeacherForm";
import StudentForm from "./StudentForm";
import { User, Teacher, Student } from "../types/student";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import axiosClientInstance from "../lib/axiosInstance";
import ProfileForm from "./ProfileForm";

const SettingsPage: React.FC = () => {
  const [user, setUser] = useState<User[]>([]);
  const [teacher, setTeacher] = useState<Teacher>();
  const [student, setStudent] = useState<Student>();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const userRole = useSelector((state:RootState)=> state.auth.user?.role)
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axiosClientInstance.get<User[]>("/users/");        
        setUser(response.data);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    const fetchTeacher = async () => {
      if (userRole === "student") {
        return;
      }
      try {
        const response = await axiosClientInstance.get<Teacher>("/teachers/me/");
        
        setTeacher(response.data);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    const fetchStudent = async () => {
      if (userRole === "teacher") {
        return;
      }
      try {
        const response = await axiosClientInstance.get<Student>("/students/me/");
        
        setStudent(response.data);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUser();
    fetchTeacher();
    fetchStudent();
  }, []);


  const handleProfileUpdate = async (updatedData: Partial<User>, avatarFile?: File) => {
    if (!user[0]?.id) {
      alert("User data is not loaded yet. Please try again.");
      return;
    }
  
    const formData = new FormData();
  
    // Append non-file fields
    Object.entries(updatedData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
  
    // Append avatar file if selected
    if (avatarFile) {
      formData.append("avatar_file", avatarFile);
    }
  
    try {
      const response = await axiosClientInstance.put<User>(
        `/users/${user[0].id}/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data", // Ensure proper format for file upload
          },
        }
      );
  
      setUser([response.data]); // Update user state
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    }
  };
  

  const handleTeacherUpdate = async(updatedData: Partial<Teacher>) => {
    if (!teacher?.id) {
      alert("User data is not loaded yet. Please try again.");
      return;
    }
    const formData = new FormData();
  
    Object.entries(updatedData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    try {
      const response = await axiosClientInstance.put<Teacher>(
        `/teachers/${teacher.id}/`,
        formData,
      );
  
      setTeacher(response.data);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    }
  };

  const handleStudentUpdate = async (updatedData: Partial<Student>) => {
    if (!student?.id) {
        alert("User data is not loaded yet. Please try again.");
        return;
    }

    // Convert object values to IDs before sending
    const formattedData: any = { ...updatedData };

    if (updatedData.grade && typeof updatedData.grade === "object") {
        formattedData.grade_id = updatedData.grade.id; // ✅ Send grade_id instead of grade
        delete formattedData.grade; // Remove the old grade key
    }

    if (updatedData.field_of_study && typeof updatedData.field_of_study === "object") {
        formattedData.field_of_study_id = updatedData.field_of_study.id; // ✅ Send field_of_study_id instead of field_of_study
        delete formattedData.field_of_study; // Remove the old field_of_study key
    }

    console.log(formattedData); // Debugging

    try {
        const response = await axiosClientInstance.put<Student>(
            `/students/${student.id}/`,
            formattedData, // ✅ Send JSON, not FormData
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        setStudent(response.data);
        alert("Profile updated successfully!");
    } catch (error) {
        console.error("Error updating profile:", error);
        alert("Failed to update profile. Please try again.");
    }
};
  


if (isLoading) {
  return <div>Loading...</div>;
}
  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* General Profile Information */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
        {user && <ProfileForm user={user[0]} onSubmit={handleProfileUpdate} />}      
        </div>

      {/* Teacher-Specific Information */}
      {teacher && user && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Teacher Information</h2>
           <TeacherForm teacher={teacher} onSubmit={handleTeacherUpdate} />
        </div>
      )}

      {/* Student-Specific Information */}
      {student && user && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Student Information</h2>
          <StudentForm student={student} onSubmit={handleStudentUpdate} />
        </div>
      )}
    </div>
  );
};

export default SettingsPage;