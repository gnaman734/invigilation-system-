import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, message }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Action">
      <p className="text-sm text-gray-700">{message}</p>

      <div className="mt-5 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="app-btn-ghost"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="app-btn-danger"
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
}
