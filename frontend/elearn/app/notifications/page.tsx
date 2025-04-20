"use client"
import React, { useEffect, useState } from 'react';
import axiosClientInstance from '../lib/axiosInstance';
;

const NotificationPage = () => {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        // Fetch notifications when the component mounts
        const getNotifications = async () => {
            const notification = await axiosClientInstance.get('/notifications/');

            setNotifications(notification.data);
        };

        getNotifications();
    }, []);

    const markNotificationAsRead = async (notificationId: number) => {
        try {
            const response = await axiosClientInstance.put(`/notifications/${notificationId}/`, {
                read: true, // Update the `read` field to `true`
            });
            console.log("Notification marked as read:", response.data);
            return response.data; // Return the updated notification
        } catch (error) {
            console.error("Error marking notification as read:", error);
            throw error; // Handle the error in the UI
        }
    };

    const handleMarkAsRead = async (notificationId: number) => {
        try {
            const updatedNotification = await markNotificationAsRead(notificationId);

            // Update the notification in the state
            setNotifications((prevNotifications: any) =>
                prevNotifications.map((notification: any) =>
                    notification.id === notificationId ? updatedNotification : notification
                )
            );
            return true; // Indicate success
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
            return false; // Indicate failure
        }
    };

    const handleNotificationClick = async (notification: any) => {
        // Mark the notification as read first
        const success = await handleMarkAsRead(notification.id);

        // If marking as read was successful, proceed to navigation
        if (success) {
            if (notification.notification_type === 'scheduled' && notification.group_id) {
                // Navigate to /groups/allgroups/{group_id}
                window.location.href = `/groups/allgroups/${notification.group_id}`;
            } else if (notification.notification_type === 'start_live' && notification.room_id) {
                // Navigate to /lives?roomId={room_id}
                window.location.href = `/lives?roomId=${notification.room_id}`;
            }
        } else {
            console.log("Navigation aborted due to failure in marking as read.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-light p-6 flex">
            
            <div className='m-auto p-8 h-screen mx-auto bg-white shadow-lg rounded-lg overflow-hidden'>
                <div className="px-6 py-4 border-b border-gray-light">
                    <h2 className="text-2xl font-semibold text-gray-800">تنبيهات</h2>
                </div>
                <div className="divide-y divide-gray-light">
                    {notifications.length > 0 ? (
                        notifications.map((notification: any) => (
                            <div
                                key={notification.id}
                                className="p-6 hover:bg-gray-light transition duration-150 ease-in-out cursor-pointer"
                                onClick={() => handleNotificationClick(notification)} // Updated click handler
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex-shrink-0">
                                            {notification.notification_type === 'meeting_start' && (
                                                <span className="h-10 w-10 flex items-center justify-center bg-blue-200 rounded-full">
                                                    <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                                    </svg>
                                                </span>
                                            )}
                                            {notification.notification_type === 'scheduled' && (
                                                <span className="h-10 w-10 flex items-center justify-center bg-green-200 rounded-full">
                                                    <svg className="h-6 w-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                    </svg>
                                                </span>
                                            )}
                                        </div>
                                        {/* Notification Content */}
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-dark">{notification.message}</p>
                                            <p className="text-sm text-gray-700">
                                                {new Date(notification.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Mark as Read Button */}
                                    {!notification.read && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent the notification click handler from firing
                                                handleMarkAsRead(notification.id);
                                            }}
                                            className="p-2 text-sm h-4 w-2 font-medium text-white bg-red-500 rounded-full  focus:outline-none"
                                        >
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-6 text-center text-gray-500">
                            No notifications found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationPage;