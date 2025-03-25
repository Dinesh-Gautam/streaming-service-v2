import { Fragment } from 'react';

import styles from '@/styles/modules/separator.module.scss';

type SeparatorProps = {
  values: (string | number | undefined)[];
  gap?: number;
};

function Separator({ values, gap }: SeparatorProps) {
  return (
    <div
      style={{ gap: gap || 0 }}
      className={styles.separatorContainer}
    >
      {values
        .filter((e) => e && e !== 0 && e.toString().trim())
        .map((value, index, arr) => {
          return (
            <Fragment key={index}>
              <span>{value}</span>
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
