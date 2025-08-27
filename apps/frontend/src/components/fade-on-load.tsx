import React, { ReactNode } from 'react';

import { motion } from 'motion/react';

/**
 * Fades in children on mount.
 */
function FadeInOnMount({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {children}
    </motion.div>
  );
}

export default FadeInOnMount;
