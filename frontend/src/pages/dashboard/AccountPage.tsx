import { useEffect, useState, type FormEvent } from "react";
import {
  createUserRequest,
  fetchUsers,
  toggleUserStatusRequest,
  updateUserPasswordRequest,
} from "@/api/client";
import type { Role, StaffUser } from "@/api/client";
import Icon from "@/components/ui/Icon";
import StatusPill from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import EmptyState from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import PrimaryAction from "@/components/ui/PrimaryAction";
import SearchBar from "@/components/ui/SearchBar";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

/** Data form tambah akun staf. */
interface CreateStaffPayload {
  name: string;
  username: string;
  password: string;
  role: Role;
}

/** Kelas select meniru primitif ui/Input (tidak ada komponen select). */
const SELECT_CLASS =
  "flex h-10 w-full cursor-pointer rounded-xl border border-input/80 bg-background px-3 py-2 text-sm shadow-subtle transition-all duration-150 focus-visible:border-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50";

const TH_CLASS =
  "px-5 py-3 font-display text-[11px] font-bold uppercase tracking-wider text-slate-400";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "CASHIER", label: "Cashier (CASHIER)" },
  { value: "ADMIN", label: "Admin (ADMIN)" },
];

/** Format tanggal dibuat (ISO) -> "1 Sep 2026"; '-' bila tidak valid. */
function formatCreatedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Ambil pesan Error hasil panggilan client, atau fallback generik. */
function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** Badge role: ADMIN (tint primary) / CASHIER (netral). */
function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
        role === "ADMIN"
          ? "border-primary/30 bg-primary-light text-primary-dark"
          : "border-slate-200 bg-slate-100 text-slate-600",
      )}
    >
      {role === "ADMIN" ? "Administrator" : "Cashier"}
    </span>
  );
}

/**
 * Modal tambah akun staf. Validasi imperatif di submit (pola modal Fase 1,
 * tanpa form library); modal tidak fetch — onSubmit di-prop dari parent.
 */
function AddStaffModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (payload: CreateStaffPayload) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("CASHIER");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape menutup modal (pola CustomItemModal/PaymentModal).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        username: username.trim(),
        password,
        role,
      });
      onClose();
    } catch (err) {
      setError(toErrorMessage(err, "Failed to create staff account."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-modal animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
              <Icon name="person_add" className="text-xl" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Add Staff Account
              </h2>
              <p className="text-xs text-slate-500">
                Create a new cashier or admin account.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="staff-name"
              className="mb-1.5 block font-display text-xs font-bold uppercase tracking-wider text-slate-400"
            >
              Full Name
            </label>
            <Input
              id="staff-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Budi Santoso"
              disabled={submitting}
            />
          </div>
          <div>
            <label
              htmlFor="staff-username"
              className="mb-1.5 block font-display text-xs font-bold uppercase tracking-wider text-slate-400"
            >
              Username
            </label>
            <Input
              id="staff-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. cashier2"
              autoComplete="off"
              disabled={submitting}
            />
          </div>
          <div>
            <label
              htmlFor="staff-password"
              className="mb-1.5 block font-display text-xs font-bold uppercase tracking-wider text-slate-400"
            >
              Password
            </label>
            <Input
              id="staff-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              disabled={submitting}
            />
          </div>
          <div>
            <label
              htmlFor="staff-role"
              className="mb-1.5 block font-display text-xs font-bold uppercase tracking-wider text-slate-400"
            >
              Role
            </label>
            <select
              id="staff-role"
              value={role}
              onChange={(e) =>
                setRole(e.target.value === "ADMIN" ? "ADMIN" : "CASHIER")
              }
              disabled={submitting}
              className={SELECT_CLASS}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <p
            role="alert"
            className="mb-3 mt-4 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive"
          >
            {error}
          </p>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={submitting}
          className="mt-4 h-11 w-full font-display text-sm font-bold"
        >
          <Icon name="person_add" className="text-base" />
          {submitting ? "Saving..." : "Save Account"}
        </Button>
      </form>
    </div>
  );
}

/** Modal ganti password staf (newPassword min 6 char). */
function ChangePasswordModal({
  user,
  onSubmit,
  onClose,
}: {
  user: StaffUser;
  onSubmit: (newPassword: string) => Promise<void>;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(newPassword);
      onClose();
    } catch (err) {
      setError(toErrorMessage(err, "Failed to change password."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-modal animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
              <Icon name="password" className="text-xl" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Change Password
              </h2>
              <p className="text-xs text-slate-500">
                @{user.username} • {user.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <div>
          <label
            htmlFor="staff-new-password"
            className="mb-1.5 block font-display text-xs font-bold uppercase tracking-wider text-slate-400"
          >
            New Password
          </label>
          <Input
            id="staff-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            disabled={submitting}
          />
        </div>

        {/* Error Message */}
        {error && (
          <p
            role="alert"
            className="mb-3 mt-4 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="mt-4 h-11 w-full font-display text-sm font-bold"
        >
          <Icon name="password" className="text-base" />
          {submitting ? "Saving..." : "Save New Password"}
        </Button>
      </form>
    </div>
  );
}

/** Modal konfirmasi aktif/nonaktif akun (error CANNOT_DISABLE_SELF tampil di-modal). */
function ToggleStatusModal({
  user,
  onConfirm,
  onClose,
}: {
  user: StaffUser;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabling = user.isActive;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(toErrorMessage(err, "Failed to update account status."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-modal animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              disabling
                ? "bg-amber-100 text-amber-600"
                : "bg-primary-light text-primary",
            )}
          >
            <Icon name="error" className="text-xl" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-slate-900">
              {disabling ? "Deactivate account?" : "Activate account?"}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              @{user.username} ({user.name}){" "}
              {disabling
                ? "will not be able to log in until the account is re-activated."
                : "will be able to log in again."}
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive"
          >
            {error}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={disabling ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting
              ? "Processing..."
              : disabling
                ? "Deactivate"
                : "Activate"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Halaman Manajemen Akun Staf (Task 2.1F): tabel staf + search, dialog
 * tambah akun, dialog ganti password, dan toggle status dengan konfirmasi.
 * Data hanya dari API nyata (GET /api/users) — tanpa fake data.
 */
export default function AccountPage() {
  const { user: me } = useAuthStore();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<StaffUser | null>(null);
  const [toggleTarget, setToggleTarget] = useState<StaffUser | null>(null);

  // Feedback non-modal ala POS: banner auto-hide 4 detik.
  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function loadStaff() {
    setLoading(true);
    setLoadError(null);
    try {
      setStaff(await fetchUsers());
    } catch (err) {
      setLoadError(toErrorMessage(err, "Failed to load staff."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStaff();
  }, []);

  async function handleCreate(payload: CreateStaffPayload) {
    const created = await createUserRequest(payload);
    setFeedback(
      `Account ${created.name || created.username} created successfully.`,
    );
    await loadStaff();
  }

  async function handleChangePassword(user: StaffUser, newPassword: string) {
    await updateUserPasswordRequest(user.id, newPassword);
    setFeedback(`Password for ${user.username} changed successfully.`);
    await loadStaff();
  }

  async function handleToggle(user: StaffUser) {
    await toggleUserStatusRequest(user.id);
    setFeedback(`Status for ${user.username} updated successfully.`);
    await loadStaff();
  }

  // Search nama/username (client-side, live).
  const query = search.trim().toLowerCase();
  const filtered = staff.filter(
    (u) =>
      !query ||
      u.name.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query),
  );

  return (
    <div className="flex flex-1 flex-col space-y-4">
      {feedback && (
        <div
          role="status"
          className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-[#b9e2d3] bg-[#edf7f3] px-4 py-2.5 text-sm font-medium text-[#2d5258] shadow-xs animate-in fade-in duration-150"
        >
          <Icon name="check_circle" className="shrink-0 text-base" />
          <span>{feedback}</span>
        </div>
      )}

      <Card className="flex flex-col shadow-card">
        {/* Header: judul + search + CTA tambah akun */}
        <CardHeader className="flex flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6">
          <div className="min-w-0 space-y-0.5">
            {/* Header band gaya POS: ikon + judul uppercase + subtitle di bawah. */}
            <div className="flex items-center gap-2">
              <Icon
                name="manage_accounts"
                className="text-[20px] text-[#447C84]"
              />
              <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">
                STAFF ACCOUNTS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Manage cashier and admin accounts, passwords, and access status.
            </p>
          </div>
          <div className="flex flex-row items-center gap-2">
            <div className="min-w-0 flex-1 sm:w-60 sm:flex-initial">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search name / username..."
                ariaLabel="Search staff"
              />
            </div>
            <PrimaryAction onClick={() => setAddOpen(true)}>
              <Icon name="person_add" className="text-sm" />
              Add Staff
            </PrimaryAction>
          </div>
        </CardHeader>

        {/* Error banner (state error role="alert" — pola referensi Fase 1) */}
        {!loading && loadError && (
          <div
            role="alert"
            className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive"
          >
            <Icon name="error" className="shrink-0 text-base" />
            <span>{loadError}</span>
          </div>
        )}

        {/* Body: tabel / state kosong */}
        {loading ? (
          <div className="p-4 sm:p-6">
            <EmptyState
              icon="manage_accounts"
              loading
              title="Loading staff..."
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 sm:p-6">
            {loadError ? (
              <EmptyState
                icon="error"
                title="Failed to load staff"
                description="Check your connection and reload the page."
              />
            ) : staff.length === 0 ? (
              <EmptyState
                icon="person_add"
                title="No staff accounts yet"
                description="Add the first cashier or admin account using the Add Staff button."
              />
            ) : (
              <EmptyState
                icon="search"
                title="No matching staff"
                description={`No results for search "${search}".`}
              />
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/70">
                    <th className={TH_CLASS}>Name</th>
                    <th className={TH_CLASS}>Username</th>
                    <th className={TH_CLASS}>Role</th>
                    <th className={TH_CLASS}>Status</th>
                    <th className={TH_CLASS}>Created</th>
                    <th className="px-5 py-3 text-right font-display text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-border/50 transition last:border-b-0 hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-3 font-medium text-foreground">
                        {u.name}
                        {me?.id === u.id && (
                          <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            (You)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        @{u.username}
                      </td>
                      <td className="px-5 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill active={u.isActive} />
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatCreatedDate(u.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPasswordTarget(u)}
                            aria-label={`Change password for ${u.username}`}
                            title="Change password"
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-primary-light hover:text-primary"
                          >
                            <Icon name="password" className="text-base" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setToggleTarget(u)}
                            aria-label={
                              u.isActive
                                ? `Deactivate account ${u.username}`
                                : `Activate account ${u.username}`
                            }
                            title={
                              u.isActive
                                ? "Deactivate account"
                                : "Activate account"
                            }
                            className={cn(
                              "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition hover:bg-destructive/10 hover:text-destructive",
                              u.isActive
                                ? "bg-live-light text-live"
                                : "bg-slate-100 text-slate-400",
                            )}
                          >
                            <Icon
                              name="power_settings_new"
                              className="text-base"
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Mobile (<sm): daftar kartu per staf — sibling Card besar (bukan nested)
      agar kartu putih + shadow-card kontras di atas bg slate-50. */}
      <div className="space-y-3 sm:hidden">
        {filtered.map((u) => (
          <Card key={u.id} className="space-y-3 border-slate-300 p-4">
            <div>
              <p className="font-medium text-foreground">
                {u.name}
                {me?.id === u.id && (
                  <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    (You)
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-400">@{u.username}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <RoleBadge role={u.role} />
              <StatusPill active={u.isActive} />
            </div>
            <p className="text-xs text-slate-400">
              Created {formatCreatedDate(u.createdAt)}
            </p>
            <div className="flex items-center gap-1.5 border-t border-border/50 pt-3">
              <button
                type="button"
                onClick={() => setPasswordTarget(u)}
                aria-label={`Change password for ${u.username}`}
                title="Change password"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-primary-light hover:text-primary"
              >
                <Icon name="password" className="text-base" />
              </button>
              <button
                type="button"
                onClick={() => setToggleTarget(u)}
                aria-label={
                  u.isActive
                    ? `Deactivate account ${u.username}`
                    : `Activate account ${u.username}`
                }
                title={
                  u.isActive ? "Deactivate account" : "Activate account"
                }
                className={cn(
                  "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition hover:bg-destructive/10 hover:text-destructive",
                  u.isActive
                    ? "bg-live-light text-live"
                    : "bg-slate-100 text-slate-400",
                )}
              >
                <Icon name="power_settings_new" className="text-base" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {addOpen && (
        <AddStaffModal
          onSubmit={handleCreate}
          onClose={() => setAddOpen(false)}
        />
      )}
      {passwordTarget && (
        <ChangePasswordModal
          user={passwordTarget}
          onSubmit={(newPassword) =>
            handleChangePassword(passwordTarget, newPassword)
          }
          onClose={() => setPasswordTarget(null)}
        />
      )}
      {toggleTarget && (
        <ToggleStatusModal
          user={toggleTarget}
          onConfirm={() => handleToggle(toggleTarget)}
          onClose={() => setToggleTarget(null)}
        />
      )}
    </div>
  );
}
