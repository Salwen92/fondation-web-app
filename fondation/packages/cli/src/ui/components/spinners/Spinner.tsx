import { Text } from 'ink';
import type React from 'react';
import { useEffect, useState } from 'react';
import { type SpinnerName, spinners } from './spinnerData';

export interface SpinnerProps {
  /**
   * Type of spinner to display
   * @default 'dots'
   */
  type?: SpinnerName;
}

export const Spinner: React.FC<SpinnerProps> = ({ type = 'dots' }) => {
  const [frame, setFrame] = useState(0);
  const spinner = spinners[type];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((previousFrame) => {
        const isLastFrame = previousFrame === spinner.frames.length - 1;
        return isLastFrame ? 0 : previousFrame + 1;
      });
    }, spinner.interval);

    return () => {
      clearInterval(timer);
    };
  }, [spinner]);

  return <Text>{spinner.frames[frame]}</Text>;
};

export default Spinner;
