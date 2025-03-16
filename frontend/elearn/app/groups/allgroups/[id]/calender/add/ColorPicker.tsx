import React from 'react';

interface ColorPickerProps {
  onColorSelect: (color: string) => void;
}

const colors = [
  { name: 'gray-700', className: 'bg-gray-700' },
  { name: 'green', className: 'bg-green' },
  { name: 'blue-500', className: 'bg-blue-500' },
  { name: 'yellow', className: 'bg-yellow' },
  { name: 'orange', className: 'bg-orange' },
  { name: 'red-500', className: 'bg-red-500' },
  { name: 'purple-800', className: 'bg-purple-800' },
  { name: 'pink-800', className: 'bg-pink-800' },
];

const ColorPicker: React.FC<ColorPickerProps> = ({  onColorSelect }) => {
  return (
    <div className="flex">
      <h3> اختر لون : </h3>
      {colors.map((color) => (
        <div
          key={color.name}
          className={`w-10 h-10 rounded-full cursor-pointer mx-1 border-transparent hover:border-black ${
            color.className
          } `}
          onClick={() => onColorSelect(color.name)}
          title={color.name}
        />
      ))}
    </div>
  );
};

export default ColorPicker;