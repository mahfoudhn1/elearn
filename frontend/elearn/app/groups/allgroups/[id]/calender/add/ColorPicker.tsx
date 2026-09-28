import React, { useState, useEffect } from 'react';

interface ColorPickerProps {
  onColorSelect: (color: string) => void;
}

const DEFAULT_COLOR = 'blue-500';

const colors = [
  { name: 'gray-700', className: 'bg-gray-700' },
  { name: 'green', className: 'bg-green' },
  { name: 'blue-500', className: 'bg-blue-500' },
  { name: 'yellow', className: 'bg-yellow' }, // Fixed missing shade for yellow
  { name: 'orange', className: 'bg-orange-600' }, // Fixed missing shade for orange
  { name: 'red-500', className: 'bg-red-500' },
  { name: 'purple-800', className: 'bg-purple-800' },
  { name: 'pink-800', className: 'bg-pink-800' },
];

const ColorPicker: React.FC<ColorPickerProps> = ({ onColorSelect }) => {
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLOR);

  // Notify parent of default color on initial render
  useEffect(() => {
    onColorSelect(DEFAULT_COLOR);
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleColorSelect = (colorName: string) => {
    setSelectedColor(colorName);
    onColorSelect(colorName);
  };

  return (
    <div className="flex items-center mt-4">
      <h3 className="mr-3 text-sm font-medium text-gray-700">اختر لون:</h3>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            key={color.name}
            className={`w-8 h-8 rounded-full cursor-pointer transition-all 
              ${color.className}
              ${selectedColor === color.name ? 'ring-2 ring-offset-2 ring-blue-300' : ''}
              hover:scale-110`}
            onClick={() => handleColorSelect(color.name)}
            title={color.name}
            aria-label={`Color ${color.name}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ColorPicker;