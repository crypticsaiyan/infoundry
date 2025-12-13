"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./Input.module.css";

export default function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  className = "",
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className={`${styles.inputGroup} ${className}`}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.inputWrapper}>
        <input
          type={inputType}
          className={`${styles.input} ${error ? styles.error : ""}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}
