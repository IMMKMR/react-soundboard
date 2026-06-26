import React, { useState, useEffect } from 'react';

export function SmoothSlider({ value, onChange, onCommit, ...props }) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e) => {
    const val = Number(e.target.value);
    setLocalValue(val);
    if (onChange) onChange(val);
  };

  const handleCommit = () => {
    if (onCommit) onCommit(localValue);
  };

  return (
    <input 
      type="range" 
      value={localValue} 
      onChange={handleChange}
      onMouseUp={handleCommit}
      onTouchEnd={handleCommit}
      onKeyUp={handleCommit}
      {...props} 
    />
  );
}
