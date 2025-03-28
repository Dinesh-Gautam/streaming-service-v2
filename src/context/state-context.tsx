'use client';

import React, {
  createContext,
  Dispatch,
  ReactNode,
  useContext,
  useReducer,
  useState,
} from 'react';

import type { cachedMultiSearch } from '@/server/tmdb';

type SearchState = {
  value: string;
};

export type State = {
  search: SearchState;
  searchSuggestions:
    | Awaited<ReturnType<typeof cachedMultiSearch>>['results']
    | null;
};

interface Action {
  type: 'search' | 'searchSuggestions';
  payload?: any;
}

const INTIAL_STATE: State = {
  search: { value: '' },
  searchSuggestions: null,
};

interface ContextProps {
  data: State;
  dataDispatch: Dispatch<Action>;
  videosData: any[];
  setVideosData: React.Dispatch<React.SetStateAction<any[]>>;
  moreInfoData: any[];
  setMoreInfoData: React.Dispatch<React.SetStateAction<any[]>>;
}

const stateContext = createContext<ContextProps | null>(null);

export function useData() {
  const context = useContext(stateContext);

  if (!context) throw new Error('Use useDate with Context');

  return context;
}

function reducer(state: State, action: Action): State {
  function updateState(field: keyof State, value?: any): State {
    return {
      ...state,
      [field]: value,
    };
  }

  switch (action.type) {
    case 'search':
      return updateState('search', action.payload);
    case 'searchSuggestions':
      return updateState('searchSuggestions', action.payload);
    default:
      return state;
  }
}

interface ContextProviderProps {
  children: ReactNode;
}

export function ContextProvider({ children }: ContextProviderProps) {
  const [data, dataDispatch] = useReducer(reducer, INTIAL_STATE);
  const [videosData, setVideosData] = useState<any[]>([]);
  const [moreInfoData, setMoreInfoData] = useState<any[]>([]);
  const value: ContextProps = {
    data,
    dataDispatch,
    videosData,
    setVideosData,
    moreInfoData,
    setMoreInfoData,
  };

  return (
    <stateContext.Provider value={value}>{children}</stateContext.Provider>
  );
}
