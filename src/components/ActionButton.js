// components/ActionButton.jsx
export default function ActionButton({ onClick, children }) {
  return (
    <button onClick={onClick} className="custom-button">
      {children}
    </button>
  );
}
