import React, { useState } from 'react';
import axiosClientInstance from '../../lib/axiosInstance';

const CheckUploadForm = ({ subscriptionId }:any) => {
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
        formData.append('subscription_id', subscriptionId);
        formData.append('check_image', checkImage);

        try {
            const response = await axiosClientInstance.post('/subscriptions/upload-check/', formData, {
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
            <h1>يرجى الدفع عن طريق الحوالة او تطبيق بريدي موب و رفع صورة التحويل 
                و سيتم الاتصال بك فور التأكد من التحويل
            </h1>
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