/* ModalManager shim — provides minimal global API so legacy pages won't throw.
	 This file intentionally implements small, DOM-based helpers that open/close
	 elements with a `.hidden` class. It does NOT provide animations or advanced
	 behaviors of the original manager. */

(function () {
	const noop = () => {};

	const open = (id) => {
		const el = document.getElementById(id);
		if (!el) return console.warn("ModalManager.open: element not found", id);
		el.classList.remove("hidden");
	};

	const close = (id) => {
		const el = document.getElementById(id);
		if (!el) return console.warn("ModalManager.close: element not found", id);
		el.classList.add("hidden");
	};

	const toggle = (id) => {
		const el = document.getElementById(id);
		if (!el) return console.warn("ModalManager.toggle: element not found", id);
		el.classList.toggle("hidden");
	};

	const resetForm = (modalId) => {
		// Try common patterns: form with id equal to `${modalId}-form` or a form inside modal
		const formById = document.getElementById(`${modalId}-form`);
		if (formById && typeof formById.reset === "function") return formById.reset();
		const modal = document.getElementById(modalId);
		if (!modal) return;
		const form = modal.querySelector("form");
		if (form && typeof form.reset === "function") form.reset();
	};

	// Attach global API
	window.ModalManager = {
		open,
		close,
		toggle,
		resetForm,
	};

	// Backwards-compatible helpers some pages call directly
	window.openModal = (id) => window.ModalManager.open(id);
	window.closeModal = (id) => window.ModalManager.close(id);
	window.toggleModal = (id) => window.ModalManager.toggle(id);
	window.closeModals = () => {
		// close any element with class 'modal' or 'modal-container' that's visible
		document.querySelectorAll('.modal:not(.hidden), .modal-container:not(.hidden), .modal-wrapper:not(.hidden)').forEach((m) => m.classList.add('hidden'));
	};
})();
