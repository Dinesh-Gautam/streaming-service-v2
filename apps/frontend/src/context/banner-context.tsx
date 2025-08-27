'use client';

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from 'react';

type ContextProps = {
  currentIndex: number;
  setCurrentIndex: Dispatch<SetStateAction<number>>;
};

const BannerContext = createContext<ContextProps | null>(null);

export const useBanner = () => {
  const context = useContext(BannerContext);

  if (!context) {
    throw new Error('You forget to add BannerProvider');
  }

  return context;
};

export function BannerProvider({ children }: PropsWithChildren) {
  const [currentIndex, setCurrentIndex] = useState(1);

  return (
    <BannerContext.Provider value={{ currentIndex, setCurrentIndex }}>
      {children}
    </BannerContext.Provider>
  );
}
