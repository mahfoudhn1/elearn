import React from "react";

interface Task {
  title: string;
  time: string; // e.g., "09:00"
  note?: string; // Optional note for the task
}

interface DayViewCalendarProps {
  tasks: Task[];
}

const DayViewCalendar: React.FC = () => {
    
    const tasks: Task[] = [
        { time: "9:30", title: "الثانية ثانوي علمي" },
        { time: "12:00", title: "امتحان بكالوريا" },
        { time: "15:00", title: "الاولى ثانوي" },
        { time: "18:00", title: "الثالثة ثانوي ادب", note:" مراجعة سريعة" }
        ];

    const validTasks = Array.isArray(tasks) ? tasks : [];

  // Create a Set of unique task times
  const taskTimes = new Set(validTasks.map(task => task.time));

  // Convert the Set back to an array for mapping
  const uniqueTaskTimes = Array.from(taskTimes).sort();

  return (
    <div className=" flex flex-col bg-white shadow-lg justify-center text-center py-2 px-4 rounded-xl">
      <h2>دروس اليوم</h2>
      <table className="bg-white shadow-sm p-y border-none rounded-xl px-4">

        <tbody>
          {uniqueTaskTimes.map((time) => {
            const task = validTasks.find(task => task.time === time);
            return (
              <tr key={time}>
                <td className="border-none text-xs p-2">
                  {task ? task.time : ""}
                </td>
                <td  className="border-none p-2">
                  {task ? (
                    <div className="bg-orange bg-opacity-50 p-2">
                      <h1 className="text-xs font-semibold text-gray-800">{task.title}</h1>
                      {task.note && <p className="text-xs text-gray">{task.note}</p>}
                    </div>
                  ) : (
                    "No Task"
                  )}
                </td>

              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DayViewCalendar;


