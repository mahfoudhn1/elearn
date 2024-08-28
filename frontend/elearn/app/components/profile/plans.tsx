
import React from 'react';

interface PlansProps {
    onSelectPlan: (planId: number) => void;
  }
export const PlanComponent: React.FC<PlansProps> = ({ onSelectPlan }) => {
    interface Plan {
        id: number;
        name: string;
      }
      const plan1:Plan = {id:1, name: 'Monthly Plan' }
      const plan2:Plan = {id:2, name: 'quarter' }
      const plan3:Plan = {id:3, name: 'yearly' }

    const handleSelect = (planId : number) => {
        onSelectPlan(planId);
      };
    

    return(
    <div className=" overflow-hidden w-full bg-white top-4 right-0 absolute">
    <div className="bg-gray-700 px-4 py-16 min-h-screen">
    <div aria-hidden="true" className="absolute inset-0 h-max w-full m-auto grid grid-cols-2 -space-x-52 opacity-20">
        <div className="blur-[106px] h-56 bg-gradient-to-br to-purple from-blue"></div>
        <div className="blur-[106px] h-32 bg-gradient-to-r from-purple to-pink"></div>
    </div>
    <div className="max-w-7xl mx-auto px-6 md:px-12 xl:px-6">
        <div className="mb-10 space-y-4 px-6 md:px-0">
        <h2 className="text-center text-2xl font-bold text-white sm:text-3xl md:text-4xl">الاشتراكات</h2>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
        <div
            className="flex flex-col items-center aspect-auto p-4 group sm:p-8 border rounded-3xl bg-gray-800 border-gray-700 shadow-gray-700/10 shadow-none m-2 flex-1 max-w-md">
            
            <h2 className="text-lg sm:text-xl font-medium text-white mb-2">اشتراك شهري</h2>
            <p className="text-lg sm:text-xl text-center mb-8 mt-4 text-gray">
            <span className="text-3xl sm:text-4xl font-bold text-white">1500 دج</span> / الشهر
            </p>
            <ul className="list-none list-inside mb-6 text-center text-gray-300">
            <li className="font-bold text-orange">30 تلميذ في الحصة</li>
            <li>دروس مباشرة مع الاستاذ</li>
            <li> مواضيع و موارد</li>
            <li>10 أسئلة مجانية لمساعد الذكاء اصطناعي</li>
            </ul>
            <button 
            className="lemonsqueezy-button relative flex h-9 w-full items-center justify-center px-4 before:absolute before:inset-0 before:rounded-full before:bg-white before:transition before:duration-300 hover:before:scale-105 active:duration-75 active:before:scale-95 sm:w-max"
            onClick={() => handleSelect(plan1.id)}
            ><span className="relative text-sm font-semibold text-black">سجل الأن</span></button>
        </div>
        <div
            className="flex flex-col items-center aspect-auto p-4 sm:p-8 border rounded-3xl bg-gray-800 border-gray-700 shadow-gray-600/10 shadow-none m-2 flex-1 max-w-md">
            <h2 className="text-lg sm:text-xl font-medium text-white mb-2">اشتراك فصلي</h2>
            <p className="text-lg sm:text-xl text-center mb-8 mt-4 text-gray">
            <span className="text-3xl sm:text-4xl font-bold text-white">4500</span> / 3 أشهر
            </p>
            <ul className="list-none list-inside mb-6 text-center text-gray-300">
            <li className="font-bold text-orange">30 تلميذ في الحصة</li>
            <li>دروس مباشرة مع الاستاذ</li>
            <li> مواضيع و موارد</li>
            <li> أسئلة مجانية غير محدودة لمساعد الذكاء اصطناعي</li>
            </ul>
            <button 
            className="lemonsqueezy-button relative flex h-9 w-full items-center justify-center px-4 before:absolute before:inset-0 before:rounded-full before:bg-white before:transition before:duration-300 hover:before:scale-105 active:duration-75 active:before:scale-95 sm:w-max"
            onClick={() => handleSelect(plan2.id)}
            ><span className="relative text-sm font-semibold text-black">سجل الأن</span></button>
        </div>
        <div
            className="flex flex-col items-center aspect-auto p-4 sm:p-8 border rounded-3xl bg-gray-800 border-gray-700 shadow-gray-600/10 shadow-none m-2 flex-1 max-w-md">
            <h2 className="text-lg sm:text-xl font-medium text-white mb-2">اشتراك سنوي</h2>
            <p className="text-lg sm:text-xl text-center mb-8 mt-4 text-gray">
            <span className="text-3xl sm:text-4xl font-bold text-white">1200دج</span> / السنة
            </p>
            <ul className="list-none list-inside mb-6 text-center text-gray-300">
            <li className="font-bold text-orange">30 تلميذ في الحصة</li>
            <li>دروس مباشرة مع الاستاذ</li>
            <li> مواضيع و موارد</li>
            <li> كورسات مجانية</li>
            <li> أسئلة مجانية غير محدودة لمساعد الذكاء اصطناعي</li>
            </ul>
            <button 
            className="lemonsqueezy-button relative flex h-9 w-full items-center justify-center px-4 before:absolute before:inset-0 before:rounded-full before:bg-white before:transition before:duration-300 hover:before:scale-105 active:duration-75 active:before:scale-95 sm:w-max"
            onClick={() => handleSelect(plan3.id)}
            ><span className="relative text-sm font-semibold text-black">سجل الأن</span></button>
        </div>
        </div>
    </div>
    </div>       
 </div>
    )
}