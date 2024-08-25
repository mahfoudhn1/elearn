import React, { useEffect } from "react";

export default function DayViewCalendar() {

    return (
        <>
            <div className="flex items-center justify-center">
                <div className=" w-full shadow-lg">
                    <div className="md:p-8 text-center  bg-white rounded-t">
                        <div className="px-4 flex items-center justify-between">
                            <h1 className="text-xl font-bold  text-gray-800">دروس اليوم</h1>
                           
                        </div>
                        <div className="flex items-center justify-between">
       
                        </div>
                    </div>
                    <div className="md:py-8 py-5 md:px-8 px-5 bg-white rounded-b">
                        <div className="px-4">
                            <div className="border-b pb-4 border-gray-700 border-dashed">
                                <p className="text-xs font-light leading-3 text-gray">9:00 AM</p>
                                <p className="text-lg font-medium leading-5 text-gray-800 pt-2">مراجعة عامة دروس الدوال بكالوريا</p>
                                <p className="text-sm pt-2 leading-4  text-gray">مناقشة و حل مسائل متعلقة بالدوال</p>
                            </div>
                            <div className="border-b pb-4 border-gray-700 border-dashed pt-5">
                              <div className="absolute inset-0 bg-purple-500 opacity-50"></div>

                                <p className="text-xs font-light leading-3 text-gray">10:00 AM</p>
                                <p className="text-lg font-medium leading-5 text-gray-800 pt-2"> حل اختبار السنة الثانية متوسط</p>
                            </div>
                            <div className="border-b pb-4 border-gray-700 border-dashed pt-5">
                                <p className="text-xs font-light leading-3 text-gray">9:00 AM</p>
                                <p className="text-lg font-medium leading-5 text-gray-800  pt-2">درس خاص للتلميذ أحمد محمد</p>
                                <p className="text-sm pt-2 leading-4  text-gray">درس دعم خاص مع التركيز على النقاط الغير مفهومة</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
