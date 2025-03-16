import Link from "next/link";
import Sidebar from "../components/dahsboardcomponents/sidebar";

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

// Soft pastel colors for sticky notes
const stickyNoteColors = [
  "bg-[#FDFD96]", // Light yellow
  "bg-[#FFB3BA]", // Light pink
  "bg-[#BAFCA2]", // Light green
  "bg-[#A2DDFC]", // Light blue
  "bg-[#D4A5F7]", // Light purple
  "bg-[#FFDFBA]", // Light orange
];

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-light p-6 flex">
      <Sidebar/>
    <div className="flex flex-col m-auto h-screen items-center w-full justify-center min-h-screen bg-gradient-to-br from-[#F9F9F9] to-[#E0E0E0] p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories.map((category, index) => (
          <Link key={category.id} href={`/notes/${category.name}`}>
            <div
              className={`relative rounded-lg shadow-lg w-40 h-40 flex flex-col items-center justify-center p-4 transform rotate-0 hover:rotate-2 transition-transform duration-200 cursor-pointer ${stickyNoteColors[index % stickyNoteColors.length]
                }`}
              style={{
                boxShadow: "4px 4px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              {/* Sticky note "tape" effect */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-16 h-4 bg-white bg-opacity-30 rounded-full"></div>
              <div className="text-xl font-bold text-gray-800 text-center">
                {category.name}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
    </div>

  );
};

export default Home;