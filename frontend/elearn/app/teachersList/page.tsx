"use client"
import React, { useState, useEffect, ChangeEvent } from 'react';
import axiosInstance from '../../store/axiosInstance';
import axios from 'axios';


interface CityProps {
    cities: string[];
    error?: string;
}

interface Filters {
    teaching_level: string;
    teaching_subjects: string;
    wilaya: string;
    search: string;  

}

interface Teacher {
    id: number;
    first_name: string;
    last_name: string;
    avatar: string;
    degree: string;
    university: string;
    price: number;
    wilaya:string;
    teaching_subjects: string;
}

// Convert Filters object to Record<string, string>
const filtersToQueryParams = (filters: Filters): Record<string, string> => {
    const queryParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters)) {
        if (value) {
            queryParams[key] = value;
        }
    }
    return queryParams;
};

const fetchTeachers = async (filters: Filters): Promise<Teacher[]> => {
    const queryParams = new URLSearchParams(filtersToQueryParams(filters)).toString();
    const response = await axiosInstance.get(`/teachers/?${queryParams}`);
    if (!response) {
        throw new Error('Network response was not ok');
    }
    console.log(response.data);
    
    return response.data;
};

const TeacherFilter: React.FC = () => {
    const [filters, setFilters] = useState<Filters>({
        teaching_level: '',
        teaching_subjects: '',
        wilaya: '',
        search: '' 

    });
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadTeachers = async () => {
            try {
                const teachersList = await fetchTeachers(filters);
                setTeachers(teachersList);
            } catch (err) {
                setError('Failed to fetch teachers');
            }
        };

        loadTeachers();
    }, [filters]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };
    const fetchCities = async (): Promise<string[]> => {
        const response = await axios.get('/api/cities');
        if (!response) {
            throw new Error('Network response was not ok');
        }
        return response.data;
    };
    
    return (
<div className="p-6 bg-gray-100 min-h-screen mt-8">
    {error && <p className="text-red-500 mb-4">{error}</p>}
    <h1 className='text-2xl text-gray-dark mb-4 font-semibold mr-8 '>قائمة اساتذتنا</h1>
    <p className='text-grey mb-4  mr-8' > ابحث في قائمة من أفضل الأساتذة في مجلاتهم </p>
    <div className="mb-6 flex mx-auto justify-center flex-col md:flex-row gap-4">

       <div className='flex flex-col space-y-4'>
       <label htmlFor="search text-grey"> الطور الدراسي </label>

        <select
            name="teaching_level"
            value={filters.teaching_level}
            onChange={handleChange}
            className="p-2 border-none rounded-lg shadow-md focus:outline-none "
        >
            <option value="">All</option>
            <option value="middle">Middle</option>
            <option value="secondary">Secondary</option>
        </select>
        </div>
        <div className='flex flex-col space-y-4'>
        <label htmlFor="search text-grey"> المادة الدراسية </label>

        <select
            name="teaching_subjects"
            value={filters.teaching_subjects}
            onChange={handleChange}
            className="p-2 border-none px-4 rounded-lg shadow-md focus:outline-none "
        >
            <option value="">All</option>
            <option value="math">Math</option>
            <option value="science">Science</option>
            <option value="english">English</option>
            <option value="chemistry">Chemistry</option>
        </select>
        </div>
        <div className='flex flex-col space-y-4'>
        <label htmlFor="search text-grey"> ابحث بالأسم </label>
        <input
            type="text"
            name="search"
            placeholder="Search by name"
            value={filters.search}
            onChange={handleChange}
            className="p-2 border-none rounded-lg shadow-md focus:outline-none "

            />

        </div>
        <div className='flex flex-col space-y-4'>
        <label htmlFor="search text-grey"> الولاية </label>

        <input
            type="text"
            name="wilaya"
            placeholder="Wilaya"
            value={filters.wilaya}
            onChange={handleChange}
            className="p-2 border-none rounded-lg shadow-md focus:outline-none "
        />
       </div>
    </div>

    <ul className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {teachers.map((teacher) => (
            <li key={teacher.id} className="bg-white rounded-lg shadow-md p-8 overflow-hidden">
                <div className='cardhead'>
                <div className="relative">
                    <img
                        src={teacher.avatar}
                        alt={`${teacher.first_name} ${teacher.last_name}`}
                        className="w-16 h-16 rounded-full absolute top-2 left-2 object-cover border-2 border-white shadow-sm"
                    />
                    <div className="pl-20 py-4">
                        <h3 className="text-lg font-semibold">{teacher.first_name} {teacher.last_name}</h3>
                        <p className="text-gray-600">{teacher.teaching_subjects}</p>
                    </div>
                </div>
                <div className='cardcontent'>
                    <div className="pl-20 py-4">
                        <p className="text-gray-600">{teacher.degree} - {teacher.university}</p>
                    </div>
                </div>
                <div className='cardfooter flex flex-row justify-between mx-4'>
                    <p className="text-gray-600 ">{teacher.wilaya} </p>
                    <p className="text-gray-600 text-left">{teacher.price} دج</p>

                </div>
                </div>

            </li>
        ))}
    </ul>
</div>

    );
};

export default TeacherFilter;
