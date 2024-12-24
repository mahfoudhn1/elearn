import React from 'react'

const DeckSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md animate-pulse">
    <div className="p-4">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    </div>
  </div>
);

export default DeckSkeleton