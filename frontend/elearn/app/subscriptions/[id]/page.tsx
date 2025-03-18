"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axiosClientInstance from '../../lib/axiosInstance';
import { Subscription } from '../../types/student';
import CheckUploadForm from './CheckUploadForm';

const SubscriptionPage = () => {
    const params = useParams();
    const subscriptionId = params.id;
    const [subscription, setSubscription] = useState<Subscription>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSubscription = async () => {
            try {
                const response = await axiosClientInstance.get(`/subscriptions/subscriptions/${subscriptionId}/`);
                setSubscription(response.data);
            } catch (err) {
                setError('Failed to fetch subscription details. Please try again later.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (subscriptionId) {
            fetchSubscription();
        }
    }, [subscriptionId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-red-500 text-lg">{error}</p>
            </div>
        );
    }

    if (!subscription) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-gray-600 text-lg">No subscription found.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-10">
            <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
                {/* Page Header */}
                <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">تفاصيل الاشتراك</h1>

                {/* Payment Method Banner */}
                

                {/* Teacher Information */}
                <div className="flex items-center space-x-6 mb-8 p-6 bg-blue-50 rounded-lg">
                    <img
                        src={subscription.teacher.user.avatar_file || '/default-avatar.png'}
                        alt="Teacher Avatar"
                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                    />
                    <div>
                        <p className="text-xl font-bold text-gray-800">
                            {subscription.teacher.user.first_name} {subscription.teacher.user.last_name}
                        </p>
                        <p className="text-sm text-gray-600">معلم</p>
                    </div>
                </div>

                {/* Subscription Details */}
                <div className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">معلومات الاشتراك</h2>
                        <div className="space-y-4">
                            <p className="text-gray-700">
                                <span className="font-semibold">خطة الاشتراك:</span>{' '}
                                <span className="text-gray-900">{subscription.plan.name}</span>
                            </p>
                            <p className="text-gray-700">
                                <span className="font-semibold">السعر:</span>{' '}
                                <span className="text-gray-900">{subscription.plan.price} دج</span>
                            </p>
                            <p className="text-gray-700">
                                <span className="font-semibold">المدة:</span>{' '}
                                <span className="text-gray-900">{subscription.plan.duration_days} يوم</span>
                            </p>
                        </div>
                    </div>

                    {/* Subscription Status */}
                    <div className="p-6 bg-gray-50 rounded-lg shadow-sm">
                        <p className="text-gray-700">
                            <span className="font-semibold">حالة الاشتراك:</span>{' '}
                            <span
                                className={`px-4 py-2 rounded-full text-sm font-medium ${
                                    subscription.is_active
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                }`}
                            >
                                {subscription.is_active ? 'نشط' : 'غير نشط'}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Check Upload Section */}
                {!subscription.is_active && (
                    <div className="mt-8 p-6 bg-blue-50 rounded-lg shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">رفع صورة للتحويل</h2>
                        <CheckUploadForm subscriptionId={subscription.id} />
                    </div>
                )}
            </div>
            <div className="flex justify-center">
            <div className="mb-8">
                    <img
                        src="/monda.jpeg"
                        alt="Payment Methods"
                        className="w-50 h-auto rounded-lg shadow-sm"
                    />
                </div>
                <div className="mb-8 mr-6">
                    <img
                        src="/baridimob.webp"
                        alt="Payment Methods"
                        className="w-50 h-auto rounded-lg shadow-sm"
                    />
                </div>
            </div>
                
        </div>
    );
};

export default SubscriptionPage;