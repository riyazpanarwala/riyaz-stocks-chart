// components/ActionButton.jsx
"use client";

import { motion } from "framer-motion";

export default function ActionButton({ onClick, children, disabled, ...props }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="custom-button"
      whileHover={{ y: -1, scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
