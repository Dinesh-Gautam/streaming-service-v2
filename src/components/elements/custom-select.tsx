'use client';

import { useState } from 'react';

import styles from '@/styles/modules/custom-select.module.scss';

import { AnimatePresence, motion } from 'motion/react';

const variants = {
  container: {},
  selectBox: {},
  selectBoxOpen: {
    backgroundColor: '#f9f9f9',
    borderBottomLeftRadius: '0px',
    borderBottomRightRadius: '0px',
    borderBottom: 'none',
    zIndex: 5,
  },
  arrow: {
    open: {
      transform: 'rotate(180deg)',
    },
    closed: {
      transform: 'rotate(0deg)',
    },
  },
  optionContainer: {},
  option: {},
};

type Option = {
  value: string;
  label: string;
};

type SelectProps = {
  options: Option[];
  onChange: (option: Option) => void;
  defaultValue: string | number;
};

const Select = ({ options, onChange, defaultValue }: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(
    options.find((e) => e.value === defaultValue) || null,
  );

  const handleOptionClick = (option: Option) => {
    setSelectedOption(option);
    onChange(option);
    setIsOpen(false);
  };

  const handleSelectBoxClick = () => {
    setIsOpen(!isOpen);
  };

  return (
    <motion.div
      onBlur={() => setIsOpen(false)}
      onBlurCapture={() => setIsOpen(false)}
      className={styles.container}
      variants={variants.container}
      initial="closed"
      animate={isOpen ? 'open' : 'closed'}
    >
      <motion.div
        className={styles.selectContainer}
        variants={variants.selectBox}
        onClick={handleSelectBoxClick}
      >
        <div>{selectedOption ? selectedOption.label : 'Select season'}</div>
        <motion.svg
          style={{
            marginLeft: '1rem',
          }}
          className={styles.arrow}
          variants={variants.arrow}
          animate={isOpen ? 'open' : 'closed'}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </motion.svg>
      </motion.div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.optionContainer}
            variants={variants.optionContainer}
            transition={{ duration: 0.2 }}
          >
            {options.map((option) => (
              <motion.div
                className={styles.option}
                key={option.value}
                variants={variants.option}
                onClick={() => handleOptionClick(option)}
              >
                {option.label}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Select;
