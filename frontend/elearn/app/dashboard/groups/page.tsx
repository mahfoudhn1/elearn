"use client"
import React, { useEffect, useState } from 'react'
import axiosInstance from '../../../store/axiosInstance';

const GroupsList = () => {
    const [groups, setGroups] = useState([]);

    useEffect(()=>{
        const fetchedGroups = async()=>{   
            try{
                const respnose = await axiosInstance.get('/groups/')
                console.log(respnose);   
                return respnose.data
            }catch(error){
                console.log(error);
        }} 
        fetchedGroups()
    },[])
    return (
        <div>
            <h1>Groups</h1>
            {/* {error && <p>{error}</p>}
            <ul>
                {groups.map((group) => (
                    <li key={group.id}>{group.name}</li>
                ))}
            </ul>
            <button onClick={handleCreateGroup}>Create New Group</button> */}
        </div>
    );

}
export default GroupsList