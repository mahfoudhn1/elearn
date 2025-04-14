import React, { useState } from 'react';
import axiosClientInstance from '../../lib/axiosInstance';

const CheckUploadForm = ({ session_id }:any) => {
    const [checkImage, setCheckImage] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');

    const handleFileChange = (e:any) => {
        setCheckImage(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!checkImage) {
            alert('Please select a check image.');
            return;
        }

        const formData = new FormData();
        formData.append('privatesession_id', session_id);
        formData.append('check_image', checkImage);

        try {
            const response = await axiosClientInstance.post('/privet/upload-check/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setUploadStatus('شكرا سيتم التواصل معك !!');
        } catch (error) {
            setUploadStatus('Failed to upload check.');
            console.error(error);
        }
    };

    return (
        <div className="space-y-4">
  <div className="bg-white p-5 rounded-xl shadow-inner border border-blue-200">
    <p className="text-gray-700 mb-4 text-right font-medium leading-relaxed">
      يرجى الدفع عن طريق الحوالة او تطبيق بريدي موب الى الحساب
    </p>
    
    <div className="space-y-3 text-right">
      <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
        <span className="text-blue-600 font-bold">CCP:</span>
        <span className="font-mono text-gray-800">20566459 Clé 42</span>
      </div>
      
      <div className="flex justify-between items-center  p-3 rounded-lg">
        <span className="text-blue-600 font-bold">RIP:</span>
        <span className="font-mono text-gray-800">00799999002056645907</span>
      </div>
      
            <div className="grid grid-cols-2 gap-3">
                <div className=" p-3 rounded-lg">
                <p className="text-blue-600 font-bold">اللقب:</p>
                <p className="text-gray-800">هنتوري</p>
                </div>
                <div className=" p-3 rounded-lg">
                <p className="text-blue-600 font-bold">الاسم:</p>
                <p className="text-gray-800">محفوظ</p>
                </div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-blue-600 font-bold">رقم الهاتف:</p>
                <p className="font-mono text-gray-800">0665689212</p>
            </div>
            </div>
            
            <p className="mt-5 text-right text-gray-700 italic bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
            رفع صورة التحويل و سيتم الاتصال بك فور التأكد من التحويل
            </p>
            </div>
            <input
                type="file"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <button
                onClick={handleUpload}
                className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                رفع
            </button>
            {uploadStatus && <p className="text-sm text-gray-700">{uploadStatus}</p>}
        </div>
    );
};

export default CheckUploadForm;