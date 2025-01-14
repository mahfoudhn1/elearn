"use client"; 

import React from "react";
import axiosClientInstance from "../../../lib/axiosInstance";
import { useRouter } from "next/navigation";

export default function DeleteButton({ groupId }: { groupId: number }) {
  
    const router = useRouter()
    const handleDelete = async () => {
    const confirmation = window.confirm(
        "متأكد أنك تريد حذف المجموعة؟"
        );

        if (!confirmation) {
        return; 
        }
    try {
      await axiosClientInstance.delete(`/groups/${groupId}/`);
      router.push('/groups')
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="bg-red-500 text-white p-2 rounded float-end mx-4"
    >
      حذف المجموعة
    </button>
  );
}
