"use client"
import { useState } from 'react';

const ForwardReg: React.FC = () => {
    const [currentTab, setCurrentTab] = useState(0);
  const [role, setRole] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [degree, setDegree] = useState('');
  const [university, setUniversity] = useState('');

  const handleNext = () => {
    if (currentTab < 2) {
      setCurrentTab(currentTab + 1);
    }
  };

  const handlePrevious = () => {
    if (currentTab > 0) {
      setCurrentTab(currentTab - 1);
    }
  };

  const handleRegister = () => {
    // Handle registration logic here
    console.log({
      role,
      phoneNumber,
      degree,
      university,
    });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex mb-4">
        <button
          onClick={() => setCurrentTab(0)}
          className={`flex-1 text-center py-2 px-4 ${currentTab === 0 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Choose Role
        </button>
        <button
          onClick={() => setCurrentTab(1)}
          className={`flex-1 text-center py-2 px-4 ${currentTab === 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Enter Details
        </button>
        <button
          onClick={() => setCurrentTab(2)}
          className={`flex-1 text-center py-2 px-4 ${currentTab === 2 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Confirm
        </button>
      </div>

      <div className="p-4 bg-white shadow rounded">
        {currentTab === 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Choose Your Role</h2>
            <div className="flex space-x-4">
              <button
                onClick={() => setRole('teacher')}
                className={`py-2 px-4 ${role === 'teacher' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                Teacher
              </button>
              <button
                onClick={() => setRole('student')}
                className={`py-2 px-4 ${role === 'student' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                Student
              </button>
            </div>
          </div>
        )}

        {currentTab === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Enter Your Details</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full border-gray-300 rounded p-2"
              />
            </div>
            {role === 'teacher' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Degree</label>
                  <input
                    type="text"
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    className="w-full border-gray-300 rounded p-2"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">University</label>
                  <input
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full border-gray-300 rounded p-2"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {currentTab === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Confirm Your Information</h2>
            <p><strong>Role:</strong> {role}</p>
            <p><strong>Phone Number:</strong> {phoneNumber}</p>
            {role === 'teacher' && (
              <>
                <p><strong>Degree:</strong> {degree}</p>
                <p><strong>University:</strong> {university}</p>
              </>
            )}
            <button
              onClick={handleRegister}
              className="mt-4 bg-green-500 text-white py-2 px-4 rounded"
            >
              Register
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-4">
        {currentTab > 0 && (
          <button
            onClick={handlePrevious}
            className="bg-gray-500 text-white py-2 px-4 rounded"
          >
            Previous
          </button>
        )}
        {currentTab < 2 && (
          <button
            onClick={handleNext}
            className="bg-blue-500 text-white py-2 px-4 rounded"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default ForwardReg;
