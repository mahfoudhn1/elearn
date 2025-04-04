import {faClock, faLaptop, faTools, faPeopleArrows } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const TeacherSection = () => {
  return (
    <section className="flex flex-col md:flex-row items-center justify-center py-12 px-4 bg-gray-100">
      {/* Text Section */}
      <div className="md:w-1/2 text-center md:text-right md:pr-8">
        <h2 className="text-3xl font-bold mb-6 mr-4">اذا كنت أستاذا يمكنك الانضمام الينا</h2>
        <p className="text-lg mb-6">
        استاذنا الفاضل انضم الينا و كن كن جزءا من اسرتنا التعليمية و احصل على هذه المزايا        </p>
        <ul className="space-y-4 mb-6">
          <li className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faClock} className="text-green ml-4" />
            <span>العمل وفق جدولك الخاص.</span>
          </li>
          <li className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faLaptop} className="text-orange  ml-4" />
            <span>العمل من منزلك او اي مكان تريده.</span>
          </li>
          <li className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faTools} className="text-yellow  ml-4" />
            <span>نوفر لك تقنيات حديثة و طرق تدريس مبتكرة لجعل التعليم اكثر جودة و كفاءة</span>
          </li>
          <li className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faPeopleArrows} className="text-blue  ml-4" />
            <span>الوصول الى اكبر عدد من الطلاب من جميع الاماكن مما يزيد في فرصك للتدريس.</span>
          </li>
        </ul>
        <a href="/login" className="inline-block float-left px-6 py-3 bg-gray-dark text-white font-semibold rounded-lg hover:bg-green transition-colors duration-300">
          انضم الينا
        </a>
      </div>
      
      {/* Teacher Image Section */}
      <div className="md:w-1/2 flex justify-center mt-8 md:mt-0">
        <div className="relative bg-gradient-to-r from-teal-400 to-teal-600 rounded-full p-6 transition-transform duration-300 hover:translate-y-[-10px]">
          <span className='absolute bottom-0 left-1/3 h-14 w-14 bg-gray-dark rounded-full z-10'>
          </span>
          <span className='absolute bottom-1/2 left-0 h-14 w-14 bg-green rounded-full z-10'> </span>

          <img
            src="/jointeacher.jpg" 
            alt="Teacher"
            className="rounded-full w-96 h-96 object-cover shadow-lg"
          />
        </div>
      </div>
    </section>
  );
};

export default TeacherSection;