interface FlashToastProps {
  message: string;
}

/** Full-screen poetic confirmation, calmed down from the old trippy overlay. */
export function FlashToast({ message }: FlashToastProps) {
  return (
    <div className="toast-scrim" role="status">
      <div className="toast-text">{message}</div>
    </div>
  );
}
