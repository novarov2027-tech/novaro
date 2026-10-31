export default function Modal({ onClose, narrow = true, children }) {
  return (
    <div className="veil on" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (narrow ? ' narrow' : '')} role="dialog" aria-modal="true">
        <button className="x" onClick={onClose} aria-label="Fermer">&times;</button>
        {children}
      </div>
    </div>
  );
}
