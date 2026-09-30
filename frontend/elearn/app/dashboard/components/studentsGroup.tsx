'use client'

import { useEffect, useState } from 'react'
import { fetchStudentGroups } from '../../lib/groupsApi'
import { useRouter } from 'next/navigation'
import { BookOpenText, GraduationCap, UsersRound } from 'lucide-react'
import { Group } from '../../types/student'

const GROUPS_PER_PAGE = 5

export default function TeacherGroupsList() {
  const [groups, setGroups] = useState<Group[]>([])
  const [visibleCount, setVisibleCount] = useState(GROUPS_PER_PAGE)
  const router = useRouter()

  useEffect(() => {
    fetchStudentGroups()
      .then(setGroups)
      .catch(err => console.error('Error fetching student groups', err))
  }, [])

  const handleGroupClick = (id: string) => {
    router.push(`/groups/allgroups/${id}`)
  }

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + GROUPS_PER_PAGE)
  }

  const visibleGroups = groups.slice(0, visibleCount)

  if (!groups || groups.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 bg-white rounded-lg">
        <p className="text-gray-500 text-lg font-medium">
          You are not subscribed to any groups.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white py-8 px-6 w-[95%] mx-auto rounded-lg shadow-sm border border-gray-light">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-grey-900 mb-6 text-center">
        وصول سريع للمجموعات
        </h1>
        <ul className="divide-y divide-gray-200">
          {visibleGroups.map((group) => (
            <li
              key={group.id}
              onClick={() => handleGroupClick(group.id)}
              className="py-4 px-4 transition-all duration-200 cursor-pointer 
                group rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleGroupClick(group.id)}
              role="button"
              aria-label={`View group ${group.name}`}
            >
              <div className="flex items-center space-x-4 space-x-reverse">
                <UsersRound className="w-8 h-8 text-orange-600 group-hover:text-grey-900 transition-colors flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-grey-900 truncate group-hover:text-orange-600 transition-colors">
                    {group.name}
                  </h3>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <GraduationCap className="w-4 h-4 text-gray-500" />
                      <p className="text-gray-600 font-medium">
                        عدد الطلبة: {group.students?.length ?? 0}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <BookOpenText className="w-4 h-4 text-gray-500" />
                      <p className="text-gray-600">{group.school_level}</p>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <BookOpenText className="w-4 h-4 text-gray-500" />
                      <p className="text-gray-600">{group.field_of_study_nest}</p>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Load More Button */}
        {visibleCount < groups.length && (
          <div className="text-center mt-6">
            <button
              onClick={handleLoadMore}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-md shadow-sm"
            >
              تحميل المزيد
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
