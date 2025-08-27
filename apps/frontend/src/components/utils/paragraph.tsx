import { useState } from 'react';

type FormatParagraphProps = {
  hideShowClickHere?: boolean;
  para: string;
  wordsLimit?: number;
};

export function FormatParagraph({
  hideShowClickHere,
  para,
  wordsLimit = 40,
}: FormatParagraphProps) {
  const [paraClicked, setParaClicked] = useState(false);

  const paraArr = para.split(' ');
  if (paraArr.length > wordsLimit) paraArr.length = wordsLimit;
  else return <p>{para}</p>;
  return (
    <p onClick={() => !hideShowClickHere && setParaClicked((prev) => !prev)}>
      {paraClicked ?
        para
      : <>
          {paraArr.join(' ') + '... '}
          {!hideShowClickHere && (
            <span style={{ opacity: 0.5 }}>click to read more.</span>
          )}
        </>
      }
    </p>
  );
}
