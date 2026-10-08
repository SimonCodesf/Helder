// Horizontal swipes coexist with vertical scrolling; equivalent buttons and keys
// remain available. Recognition marks never write FSRS ratings.
export function setupSwipe(onMark, onExploreMark) {
  let drag = null,
    suppressClickUntil = 0;
  document.addEventListener(
    "pointerdown",
    (event) => {
      const card = event.target.closest(
        ".flash-card[data-swipe], .exploration-card[data-swipe]",
      );
      if (
        !card ||
        event.button !== 0 ||
        event.target.closest("button,a,input,textarea,select")
      )
        return;
      drag = {
        card,
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        dx: 0,
        active: false,
      };
    },
    { passive: true },
  );
  document.addEventListener(
    "pointermove",
    (event) => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x,
        dy = event.clientY - drag.y;
      if (!drag.active && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        drag = null;
        return;
      }
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5)
        drag.active = true;
      if (!drag.active) return;
      event.preventDefault();
      drag.dx = dx;
      drag.card.style.setProperty(
        "--swipe-x",
        `${Math.max(-160, Math.min(160, dx))}px`,
      );
      drag.card.style.setProperty(
        "--swipe-angle",
        `${Math.max(-5, Math.min(5, dx / 35))}deg`,
      );
      drag.card.dataset.swipeDirection = dx > 0 ? "known" : "unknown";
    },
    { passive: false },
  );
  const end = (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const d = drag;
    drag = null;
    d.card.style.removeProperty("--swipe-x");
    d.card.style.removeProperty("--swipe-angle");
    delete d.card.dataset.swipeDirection;
    if (d.active) suppressClickUntil = Date.now() + 450;
    if (event.type === "pointerup" && d.active && Math.abs(d.dx) >= 64) {
      const explore = d.card.classList.contains("exploration-card");
      (explore ? onExploreMark : onMark)?.(d.dx > 0 ? "known" : "unknown");
    }
  };
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);
  document.addEventListener(
    "click",
    (event) => {
      if (
        Date.now() < suppressClickUntil &&
        event.target.closest(".flash-card, .exploration-card")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
}
