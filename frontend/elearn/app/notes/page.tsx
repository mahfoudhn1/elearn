import Link from "next/link";
import { shuffle } from "lodash";

const categories = [
    { id: 1, name: "رياضيات" },
    { id: 2, name: "فيزياء" },
    { id: 3, name: "كيمياء" },
    { id: 4, name: "أحياء" },
    { id: 5, name: "فرنسية" },
    { id: 6, name: "عربية" },
    { id: 7, name: "إنجليزية" },
    { id: 8, name: "تاريخ" },
    { id: 9, name: "جغرافيا" },
    { id: 10, name: "فلسفة" },
    { id: 11, name: "اقتصاد" },
  ];
  

const colors = [
  "bg-[#FF40A0]", 
  "bg-[#FCD53F]",
  "bg-[#47B5FF]",
  "bg-[#9D23FF]",
  "bg-[#FF7A00]",
  "bg-[#B83B5E]",
  "bg-[#8AC926]",
  "bg-[#B83B5E]",
  "bg-[#47B5FF]",
  "bg-[#8AC926]",
  "bg-[#47B5FF]",
  "bg-[#FF40A0]", 

];

const Home = () => {
  const shuffledColors = shuffle(colors);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((category, index) => (
          <Link key={category.name} href={`/notes/${category.name}`}> 
            <div className={`rounded-lg shadow-md w-40 h-32 flex flex-col items-center justify-center text-white hover:bg-opacity-80 cursor-pointer ${shuffledColors[index]}`}>
              <div className="text-xl font-bold">{category.name}</div>
              {/* {category.count !== null && (
                <div className="text-lg font-medium">{category.count}</div>
              )} */}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Home;