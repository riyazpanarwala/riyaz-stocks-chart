// components/ActionButton.jsx
export default function ActionButton({ onClick, children, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="custom-button"
    >
      {children}
    </button>
  );
}
