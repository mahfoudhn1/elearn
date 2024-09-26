import React from 'react';
import { ZoomMtg } from '@zoom/meetingsdk'


function videofeed() {
  ZoomMtg.preLoadWasm()
  ZoomMtg.prepareWebSDK()
  return (
    <div className="relative">
    <div className="absolute top-0 left-0 bg-red-500 text-white p-2">Recording in Progress</div>
    <div className="h-96 bg-gray-800 flex items-center justify-center text-white">
      <span>
      </span>
    </div>
  </div>
  )
}

export default videofeed
