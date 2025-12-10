import styles from "./Button.module.css";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "right",
  className = "",
  ...props
}) {
  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    className,
  ].filter(Boolean).join(" ");

  return (
    <button className={classNames} {...props}>
      {icon && iconPosition === "left" && <span className={styles.icon}>{icon}</span>}
      {children}
      {icon && iconPosition === "right" && <span className={styles.icon}>{icon}</span>}
    </button>
  );
}
