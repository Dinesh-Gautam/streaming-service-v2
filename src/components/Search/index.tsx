import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import styles from '@/styles/modules/search.module.scss';

import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { AnimatePresence, motion } from 'motion/react';

import { searchSuggest } from '@/components/Search/_action';
import Suggestions from '@/components/Search/searchSuggestion';
import { useData } from '@/context/stateContext';

// import { useViewRedirect } from "../../Utils";

function Search({ initialValue = '' }) {
  const { data, dataDispatch } = useData();

  useEffect(() => {
    dataDispatch({ type: 'search', payload: { value: initialValue } });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [searchInputFocus, setSearchInputFocus] = useState(false);
  const searchInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const searchParam = useSearchParams();

  function inputHandler(event: ChangeEvent<HTMLInputElement>) {
    const target = event.target as HTMLInputElement;
    const value = target.value;

    dataDispatch({ type: 'search', payload: { value: value } });

    if (!value.trim()) {
      dataDispatch({
        type: 'searchSuggestions',
        payload: null,
      });

      return;
    }

    searchInterval.current && clearTimeout(searchInterval.current);

    searchInterval.current = setTimeout(async () => {
      const suggestions = await searchSuggest(data.search.value);

      dataDispatch({
        type: 'searchSuggestions',
        payload: suggestions,
      });
    }, 500);
  }

  async function searchButtonHandler(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSearchInputFocus(false);

    dataDispatch({
      type: 'searchSuggestions',
      payload: null,
    });

    if (data.search.value && data.search.value !== searchParam.get('q')) {
      router.push('/search?q=' + data.search.value);
    }
  }

  return (
    <div className={styles.div}>
      <form
        style={{
          transition: 'outline 0.05s linear',
          outline:
            searchInputFocus ?
              '2px solid rgba(255, 255, 255, 0.25)'
            : '0px solid rgba(255, 255, 255,0.25)',
        }}
        onSubmit={searchButtonHandler}
        className={styles.searchContainer}
      >
        <input
          onFocus={() => setSearchInputFocus(true)}
          onBlur={() => setSearchInputFocus(false)}
          value={data.search.value}
          onChange={inputHandler}
          type="text"
          placeholder="Search"
          spellCheck={false}
        />
        <AnimatePresence>
          {data.search.value && (
            <motion.button
              type="button"
              style={{
                padding: '0',
              }}
              initial={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              animate={{
                opacity: 0.5,
              }}
              exit={{ opacity: 0 }}
              onClick={() => {
                dataDispatch({ type: 'search', payload: { value: '' } });
                dataDispatch({
                  type: 'searchSuggestions',
                  payload: null,
                });
              }}
            >
              <ClearIcon />
            </motion.button>
          )}
        </AnimatePresence>

        <button type="submit">
          <SearchIcon fontSize="medium" />
        </button>
      </form>
      <AnimatePresence>
        {searchInputFocus && data.search.value && data.searchSuggestions && (
          <Suggestions searchSuggestions={data.searchSuggestions} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Search;
