import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

const SHIFT_OPTIONS = ['Morning', 'Afternoon', 'Day'];
const EMPTY_FORM = { name: '', shift: SHIFT_OPTIONS[0], total_seats: '' };

function initialsOf(value) {
  return (
    (value || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'A'
  );
}

function shiftKeyOf(shift) {
  return (shift || '').toLowerCase().replace(/[^a-z]/g, '');
}

function extractErrorMessage(error) {
  const data = error?.data;
  if (data?.errors && typeof data.errors === 'object') {
    const messages = Object.values(data.errors).flat().filter(Boolean);
    if (messages.length > 0) return messages.join(' ');
  }
  return data?.message || error?.message || 'Something went wrong. Please try again.';
}

function validateClassForm(form, classes, editingClass) {
  const errors = {};
  const name = form.name.trim();
  const shift = form.shift.trim();
  const seats = Number(form.total_seats);

  if (!name) {
    errors.name = 'Class name is required.';
  } else if (name.length > 200) {
    errors.name = 'Class name must be at most 200 characters.';
  }

  if (!shift) {
    errors.shift = 'Shift is required.';
  } else if (shift.length > 50) {
    errors.shift = 'Shift must be at most 50 characters.';
  }

  if (
    form.total_seats === '' ||
    !Number.isInteger(seats) ||
    seats < 1 ||
    seats > 10000
  ) {
    errors.total_seats = 'Seat capacity must be a whole number between 1 and 10,000.';
  }

  const duplicate = classes.some(
    (cls) =>
      cls.id !== editingClass?.id &&
      cls.name.trim().toLowerCase() === name.toLowerCase() &&
      cls.shift.trim().toLowerCase() === shift.toLowerCase(),
  );
  if (duplicate) {
    errors.name = 'A class with this name and shift already exists.';
  }

  if (editingClass && Number.isInteger(seats) && seats >= 1) {
    const occupied = (editingClass.held_seats || 0) + (editingClass.confirmed_seats || 0);
    if (seats < occupied) {
      errors.total_seats = `Capacity cannot be below ${occupied} currently held or confirmed seat(s).`;
    }
  }

  return errors;
}

export default function AdminClassManagement({ onSignOut }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadClasses = useCallback(async () => {
    try {
      const data = await api.getAdminClasses();
      setClasses(data);
      setError('');
    } catch (err) {
      if (err.status === 401) {
        onSignOut();
        return;
      }
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [onSignOut]);

  useEffect(() => {
    let active = true;

    api
      .getAdminClasses()
      .then((data) => {
        if (!active) return;
        setClasses(data);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 401) {
          onSignOut();
          return;
        }
        setError(extractErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [onSignOut]);

  useEffect(() => {
    if (!modal && !deleteTarget) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (saving || deleting) return;
      setModal(null);
      setDeleteTarget(null);
      setDeleteError('');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modal, deleteTarget, saving, deleting]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
    setNotice('');
    setDeleteTarget(null);
    setDeleteError('');
    setModal({ mode: 'create', class: null });
  };

  const openEdit = (cls) => {
    setForm({
      name: cls.name,
      shift: cls.shift,
      total_seats: String(cls.total_seats),
    });
    setFormErrors({});
    setNotice('');
    setDeleteTarget(null);
    setDeleteError('');
    setModal({ mode: 'edit', class: cls });
  };

  const closeFormModal = () => {
    if (saving) return;
    setModal(null);
    setFormErrors({});
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const editingClass = modal?.mode === 'edit' ? modal.class : null;
    const nextErrors = validateClassForm(form, classes, editingClass);
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      name: form.name.trim(),
      shift: form.shift.trim(),
      total_seats: Number(form.total_seats),
    };

    setSaving(true);
    setError('');

    try {
      if (modal.mode === 'create') {
        const created = await api.createClass(payload);
        setNotice(`Class "${created.name}" was created.`);
      } else {
        const updated = await api.updateClass(modal.class.id, payload);
        setNotice(`Class "${updated.name}" was updated.`);
      }
      setModal(null);
      await loadClasses();
    } catch (err) {
      if (err.status === 401) {
        onSignOut();
        return;
      }
      setFormErrors({ form: extractErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (cls) => {
    setModal(null);
    setFormErrors({});
    setDeleteTarget(cls);
    setDeleteError('');
    setNotice('');
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError('');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');

    try {
      await api.deleteClass(deleteTarget.id);
      setNotice(`Class "${deleteTarget.name}" was deleted.`);
      setDeleteTarget(null);
      await loadClasses();
    } catch (err) {
      if (err.status === 401) {
        onSignOut();
        return;
      }
      setDeleteError(extractErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const shiftOptions = Array.from(
    new Set([...SHIFT_OPTIONS, ...classes.map((cls) => cls.shift), form.shift].filter(Boolean)),
  );

  const totalSeats = classes.reduce((sum, cls) => sum + cls.total_seats, 0);
  const totalHeld = classes.reduce((sum, cls) => sum + cls.held_seats, 0);
  const totalConfirmed = classes.reduce((sum, cls) => sum + cls.confirmed_seats, 0);
  const deleteOccupied = deleteTarget
    ? (deleteTarget.held_seats || 0) + (deleteTarget.confirmed_seats || 0)
    : 0;
  const editingOccupied =
    modal?.mode === 'edit'
      ? (modal.class.held_seats || 0) + (modal.class.confirmed_seats || 0)
      : 0;

  return (
    <>
      <main className="admin-manage-content">
        <div className="admin-page-heading">
          <div>
            <span className="header-eyebrow">Academics</span>
            <h1 className="admin-page-title">Class &amp; Shift Management</h1>
            <p className="admin-page-subtitle">
              Create classes, adjust seat capacity, and keep shifts organised for the admission
              process.
            </p>
          </div>
          <button type="button" className="apply-btn admin-add-btn" onClick={openCreate}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M10 4 V16 M4 10 H16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Add class
          </button>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M10 6.5 V10.5 M10 13.4 V13.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            {error}
          </div>
        )}

        {notice && (
          <div className="admin-success-banner" role="status">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M6.5 10.3 L9 12.8 L13.6 7.8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {notice}
            <button
              type="button"
              className="admin-banner-close"
              onClick={() => setNotice('')}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        <section className="stats-grid admin-stats" aria-label="Class overview">
          <div className="stat-card">
            <span className="stat-icon stat-icon-blue" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3.5" y="5" width="17" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M3.5 9.5 H20.5" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
            <span className="stat-body">
              <span className="stat-label">Classes</span>
              <span className="stat-value">{classes.length}</span>
              <span className="stat-hint">Across all shifts</span>
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-icon stat-icon-emerald" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 10 L12 4 L20 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 11 V19 H18 V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 19 V14 H14 V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="stat-body">
              <span className="stat-label">Total seats</span>
              <span className="stat-value">{totalSeats}</span>
              <span className="stat-hint">Available capacity</span>
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-icon stat-icon-amber" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 7 V12.4 L15.4 14.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="stat-body">
              <span className="stat-label">Held seats</span>
              <span className="stat-value">{totalHeld}</span>
              <span className="stat-hint">Active seat holds</span>
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-icon stat-icon-violet" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 12 L11 15 L16.5 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="stat-body">
              <span className="stat-label">Confirmed seats</span>
              <span className="stat-value">{totalConfirmed}</span>
              <span className="stat-hint">Locked admissions</span>
            </span>
          </div>
        </section>

        <section className="panel admin-classes-panel">
          <div className="section-header">
            <div>
              <h2>All classes</h2>
              <p className="section-subtitle">
                Class names can repeat across shifts. Name and shift pairs must be unique.
              </p>
            </div>
            <span className="section-count">
              {classes.length} class{classes.length === 1 ? '' : 'es'}
            </span>
          </div>

          {loading ? (
            <div className="state-box">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" opacity="0.3" />
                <path d="M12 3.5 A8.5 8.5 0 0 1 20.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Loading classes…
            </div>
          ) : classes.length === 0 ? (
            <div className="state-box">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3.5" y="5" width="17" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M3.5 9.5 H20.5" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              No classes yet. Add your first class to get started.
            </div>
          ) : (
            <div className="classes-table-wrapper">
              <table className="classes-table admin-classes-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Shift</th>
                    <th>Total seats</th>
                    <th>Held</th>
                    <th>Confirmed</th>
                    <th>Available</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls) => (
                    <tr key={cls.id}>
                      <td className="cell-name">
                        <span className="class-avatar" aria-hidden="true">
                          {initialsOf(cls.name)}
                        </span>
                        <span className="class-name">{cls.name}</span>
                      </td>
                      <td className="cell-shift">
                        <span className={`shift-badge shift-${shiftKeyOf(cls.shift)}`}>
                          {cls.shift}
                        </span>
                      </td>
                      <td className="cell-number">{cls.total_seats}</td>
                      <td className="cell-number">
                        <span className="num-held">{cls.held_seats}</span>
                      </td>
                      <td className="cell-number">
                        <span className="num-confirmed">{cls.confirmed_seats}</span>
                      </td>
                      <td className="cell-available">
                        <span
                          className={`seat-pill ${
                            cls.available_seats > 0 ? 'available-ok' : 'available-full'
                          }`}
                        >
                          {cls.available_seats}
                        </span>
                      </td>
                      <td className="cell-action">
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-icon-btn"
                            onClick={() => openEdit(cls)}
                            aria-label={`Edit ${cls.name} (${cls.shift})`}
                            title="Edit class"
                          >
                            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                              <path
                                d="M4 14.5 V16.5 H6 L15.2 7.3 L13.2 5.3 Z"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinejoin="round"
                              />
                              <path d="M11.6 6.9 L13.6 8.9" stroke="currentColor" strokeWidth="1.6" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="admin-icon-btn admin-icon-btn-danger"
                            onClick={() => requestDelete(cls)}
                            aria-label={`Delete ${cls.name} (${cls.shift})`}
                            title="Delete class"
                          >
                            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                              <path d="M4.5 6 H15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                              <path d="M7.5 6 V4.5 H12.5 V6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                              <path d="M6 6 L6.8 16 H13.2 L14 6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                              <path d="M8.6 8.8 V13.4 M11.4 8.8 V13.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {modal && (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeFormModal();
          }}
        >
          <div
            className="modal admin-class-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="class-modal-title"
          >
            <div className="modal-heading">
              <span className="modal-icon admin-modal-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M3 8 H17 M7 4 V2.8 M13 4 V2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <h2 className="modal-title" id="class-modal-title">
                  {modal.mode === 'create' ? 'Add a new class' : 'Edit class'}
                </h2>
                <p className="modal-body">
                  {modal.mode === 'create'
                    ? 'Create a class for a shift and set its total seat capacity.'
                    : 'Update the class name, shift, or seat capacity.'}
                </p>
              </div>
            </div>

            <form className="admin-form" onSubmit={handleSave} noValidate>
              <div className="admin-field">
                <label htmlFor="class-name" className="admin-label">
                  Class name
                </label>
                <input
                  id="class-name"
                  name="name"
                  type="text"
                  className="admin-input admin-input-plain"
                  placeholder="e.g. Grade 4"
                  value={form.name}
                  onChange={handleFormChange}
                  disabled={saving}
                  maxLength={200}
                  autoFocus
                  aria-invalid={!!formErrors.name}
                  aria-describedby={formErrors.name ? 'class-name-error' : undefined}
                />
                {formErrors.name && (
                  <p className="error-msg" id="class-name-error">
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div className="admin-form-row">
                <div className="admin-field">
                  <label htmlFor="class-shift" className="admin-label">
                    Shift
                  </label>
                  <input
                    id="class-shift"
                    name="shift"
                    type="text"
                    list="shift-options"
                    className="admin-input admin-input-plain"
                    placeholder="e.g. Morning"
                    value={form.shift}
                    onChange={handleFormChange}
                    disabled={saving}
                    maxLength={50}
                    aria-invalid={!!formErrors.shift}
                    aria-describedby={formErrors.shift ? 'class-shift-error' : undefined}
                  />
                  <datalist id="shift-options">
                    {shiftOptions.map((shift) => (
                      <option key={shift} value={shift} />
                    ))}
                  </datalist>
                  {formErrors.shift && (
                    <p className="error-msg" id="class-shift-error">
                      {formErrors.shift}
                    </p>
                  )}
                </div>

                <div className="admin-field">
                  <label htmlFor="class-seats" className="admin-label">
                    Total seat capacity
                  </label>
                  <input
                    id="class-seats"
                    name="total_seats"
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    className="admin-input admin-input-plain"
                    placeholder="e.g. 40"
                    value={form.total_seats}
                    onChange={handleFormChange}
                    disabled={saving}
                    aria-invalid={!!formErrors.total_seats}
                    aria-describedby={formErrors.total_seats ? 'class-seats-error' : undefined}
                  />
                  {formErrors.total_seats && (
                    <p className="error-msg" id="class-seats-error">
                      {formErrors.total_seats}
                    </p>
                  )}
                </div>
              </div>

              {modal.mode === 'edit' && (
                <p className="admin-field-hint">
                  Currently held + confirmed: {editingOccupied} seat(s). Capacity cannot be
                  reduced below this number.
                </p>
              )}

              {formErrors.form && (
                <div className="error-banner" role="alert">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 6 V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="10" cy="13.5" r="0.9" fill="currentColor" />
                  </svg>
                  {formErrors.form}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-btn modal-btn-secondary"
                  onClick={closeFormModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-btn modal-btn-primary" disabled={saving}>
                  {saving
                    ? 'Saving…'
                    : modal.mode === 'create'
                      ? 'Create class'
                      : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteModal();
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <span className="modal-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none">
                <path d="M4.5 6 H15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M7.5 6 V4.5 H12.5 V6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M6 6 L6.8 16 H13.2 L14 6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M8.6 8.8 V13.4 M11.4 8.8 V13.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <h2 className="modal-title" id="delete-modal-title">
              Delete class?
            </h2>
            <p className="modal-body">
              You are about to delete <strong>{deleteTarget.name}</strong> ({deleteTarget.shift}).
              This action cannot be undone. Classes with active applications or seat reservations
              cannot be deleted.
            </p>
            {deleteOccupied > 0 && (
              <p className="admin-delete-warning">
                This class currently has {deleteOccupied} held or confirmed seat(s).
              </p>
            )}
            {deleteError && (
              <div className="error-banner" role="alert">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 6 V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="10" cy="13.5" r="0.9" fill="currentColor" />
                </svg>
                {deleteError}
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn modal-btn-secondary"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn modal-btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete class'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
