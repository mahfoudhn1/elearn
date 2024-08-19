"use client"
import { useState } from 'react';

const ForwardReg: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [role, setRole] = useState('');
  const [phone_number, setPhone_number] = useState('');
  const [teaching_level, setTeaching_level] = useState('');
  const [teaching_subject, setTeaching_subject] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [degree, setDegree] = useState('');
  const [university, setUniversity] = useState('');
  const [branch, setBranch] = useState('');
  const [student_class, setStudent_class] = useState('');

  const handleNext = async () => {
    if (currentTab === 0) {
      // Send update request to server to update user role
      try {
        const response = await fetch('/api/update-role', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role }),
        });

        if (!response.ok) {
          throw new Error('Failed to update role');
        }

        console.log('Role updated successfully');
      } catch (error) {
        console.error('Error updating role:', error);
        return; // Prevent moving to the next tab if the request fails
      }
    }

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
      phone_number,
      teaching_level,
      teaching_subject,
      wilaya,
      degree,
      university,
      branch,
      student_class,
    });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex mb-4">
        <button
          onClick={() => setCurrentTab(0)}
          className={`flex-1 text-center py-2 px-4 ${currentTab === 0 ? 'bg-gray-dark text-white' : 'bg-gray-200'}`}
        >
          Choose Role
        </button>
        <button
          onClick={() => setCurrentTab(1)}
          className={`flex-1 text-center py-2 px-4 ${currentTab === 1 ? 'bg-gray-dark text-white' : 'bg-gray-200'}`}
        >
          Enter Details
        </button>
        <button
          onClick={() => setCurrentTab(2)}
          className={`flex-1 text-center py-2 px-4 ${currentTab === 2 ? 'bg-gray-dark text-white' : 'bg-gray-200'}`}
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
                className={`py-2 px-4 ${role === 'teacher' ? 'bg-gray-dark text-white' : 'bg-gray-200'}`}
              >
                Teacher
              </button>
              <button
                onClick={() => setRole('student')}
                className={`py-2 px-4 ${role === 'student' ? 'bg-gray-dark text-white' : 'bg-gray-200'}`}
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
                value={phone_number}
                onChange={(e) => setPhone_number(e.target.value)}
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
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Teaching Level</label>
                  <input
                    type="text"
                    value={teaching_level}
                    onChange={(e) => setTeaching_level(e.target.value)}
                    className="w-full border-gray-300 rounded p-2"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Teaching Subject</label>
                  <input
                    type="text"
                    value={teaching_subject}
                    onChange={(e) => setTeaching_subject(e.target.value)}
                    className="w-full border-gray-300 rounded p-2"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Wilaya</label>
                  <input
                    type="text"
                    value={wilaya}
                    onChange={(e) => setWilaya(e.target.value)}
                    className="w-full border-gray-300 rounded p-2"
                  />
                </div>
              </>
            )}

            {role === 'student' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Branch</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full border-gray-300 rounded p-2"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Student Class</label>
                  <input
                    type="text"
                    value={student_class}
                    onChange={(e) => setStudent_class(e.target.value)}
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
            <p><strong>Phone Number:</strong> {phone_number}</p>
            {role === 'teacher' && (
              <>
                <p><strong>Degree:</strong> {degree}</p>
                <p><strong>University:</strong> {university}</p>
                <p><strong>Teaching Level:</strong> {teaching_level}</p>
                <p><strong>Teaching Subject:</strong> {teaching_subject}</p>
                <p><strong>Wilaya:</strong> {wilaya}</p>
              </>
            )}
            {role === 'student' && (
              <>
                <p><strong>Branch:</strong> {branch}</p>
                <p><strong>Student Class:</strong> {student_class}</p>
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
