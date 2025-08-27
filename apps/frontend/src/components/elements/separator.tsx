import { Fragment } from 'react';

import styles from '@/styles/modules/separator.module.scss';

type SeparatorProps = {
  values: any[];
  gap?: number;
};

function Separator({ values, gap }: SeparatorProps) {
  return (
    <div
      style={{ gap: gap || 0 }}
      className={styles.separatorContainer}
    >
      {values.filter(Boolean).map((value, index, arr) => {
        return (
          <Fragment key={index}>
            <span>{String(value)}</span>
            {index + 1 < arr.length && (
              <span className={styles.separator}></span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

export default Separator;
