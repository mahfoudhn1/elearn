import React from 'react'
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css'
import 'swiper/swiper-bundle.css'
import { Navigation, Pagination, Scrollbar, A11y, Autoplay } from 'swiper/modules';


const clients = [
  { id: 1, name: 'marya', review: 'أخيرا فتح الموقع لي كنت نستناه منذ مدة علابالي راح تكون تجربة رائعة و نستفاد بزاف.', image: 'https://randomuser.me/api/portraits/women/20.jpg' },
  { id: 2, name: 'Lamia ', review: 'يبدو موقع جيد للدراسة وإيجاد اساتذة أكفاء مع سهولة وسلاسة في استخدام الموقع.', image: 'https://randomuser.me/api/portraits/women/21.jpg' },
  { id: 3, name: 'Abdelmalek Guitarni', review: 'أوصي بشدة بهذه الخدمة! كان الموظفون على دراية وودودين، والنتائج كانت رائعة. كان من دواعي سروري العمل مع فريق ملتزم.', image: 'https://randomuser.me/api/portraits/men/22.jpg' },
  // { id: 4, name: 'Sophia Davis', review: 'تجربة رائعة بشكل عام! كانت الخدمة سريعة وفعالة، وكان المنتج النهائي بالضبط كما كنت أتمنى. دعم العملاء كان ممتازًا طوال العملية.', image: 'https://randomuser.me/api/portraits/women/23.jpg' },
  // { id: 5, name: 'James Wilson', review: 'سأستخدم هذه الخدمة مرة أخرى بالتأكيد. كان الفريق محترفًا وموثوقًا، وقدم نتائج عالية الجودة. كانت تجربة خالية من التوتر من البداية إلى النهاية.', image: 'https://randomuser.me/api/portraits/men/24.jpg' },
  // { id: 6, name: 'Olivia Martinez', review: 'خدمة رائعة! كنت ممتنًا لكيفية تعامل الفريق مع جميع التفاصيل. النتيجة كانت ممتازة، والتجربة كانت ممتعة للغاية.', image: 'https://randomuser.me/api/portraits/women/25.jpg' },
  // { id: 7, name: 'Daniel Lee', review: 'الخدمة كانت ممتازة! التزام الفريق بالجودة وتفانيهم في العمل كان واضحًا. سأوصي بهذه الخدمة لأي شخص يبحث عن نتائج ممتازة.', image: 'https://randomuser.me/api/portraits/men/26.jpg' },
  // { id: 8, name: 'Ava White', review: 'تجربة رائعة! الخدمة كانت مهنية للغاية، والنتائج كانت فوق توقعاتي. كنت سعيدًا بكل جانب من جوانب الخدمة.', image: 'https://randomuser.me/api/portraits/women/27.jpg' },
  // { id: 9, name: 'Ethan Harris', review: 'أوصي بشدة بهذه الخدمة لأي شخص يبحث عن جودة عالية ونتائج ممتازة. كان الفريق محترفًا، وكان كل شيء يسير بسلاسة.', image: 'https://randomuser.me/api/portraits/men/28.jpg' },
  // Add more clients as needed
];


function Review() {
  return (
    <div className='px-10'>
      <div className='text-center py-10'>
        <h2 className="text-3xl font-bold text-black mb-4">أراء طلبتنا و أساتذتنا</h2>
        <p className="text-lg text-gray-dark ">اطلع على ما يقوله عملائنا عنا</p>
      </div>
      <div className="w-full ">
      <Swiper
        modules={[Pagination, Scrollbar, A11y, Autoplay]}
        spaceBetween={50}
        slidesPerView={1}
        
        autoplay
        breakpoints={{
          640: {
            slidesPerView: 1,
          },
          768: {
            slidesPerView: 2,
          },
          1024: {
            slidesPerView: 4,
          },
          1280: {
            slidesPerView: 4,
          },
        }}
        className="mySwiper"
      >
        {clients.map(client => (
          <SwiperSlide key={client.id} className="p-4">
            <div className="bg-white rounded-lg shadow-lg p-4 flex flex-col items-center">
              <p className="text-gray-dark text-center mb-4 p-4">{client.review}</p>
              <div className='flex flex-row mt-3 justify-between w-full '>
                <h2 className="text-sm font-semibold mt-2">{client.name}</h2>
                <img src={client.image} alt={client.name} className="w-10 h-10 rounded-full object-cover mb-4" />

              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
    </div>
  )
}

export default Review