import React from 'react';

const ZoomAuthButton: React.FC = () => {
  const handleZoomAuth = () => {
    window.location.href = '/api/zoom/';
  };

  return (
    <button
      onClick={handleZoomAuth}
      className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
    >
      Connect Zoom Account
    </button>
  );
};

export default ZoomAuthButton;
