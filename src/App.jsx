import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function makeDefaultForm() {
  return {
    id: null,
    company: "",
    role: "",
    source: "",
    status: "Applied",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  };
}

function decodeJwt(credential) {
  try {
    const [, payload] = credential.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized);
    return JSON.parse(decoded);
  } catch (err) {
    console.warn("Unable to decode Google credential", err);
    return null;
  }
}

const STATUSES = ["Applied", "Interviewing", "Offer", "Rejected"];

const STAT_META = {
  total: { label: "Total Applications", chip: "Full Grid" },
  Applied: { label: "Applied", chip: "Launch Lap" },
  Interviewing: { label: "Interviewing", chip: "Pit Wall" },
  Offer: { label: "Offer", chip: "Podium Finish" },
  Rejected: { label: "Rejected", chip: "Race Debrief" },
};

const STATUS_ACCENTS = {
  Applied: "status-chip--Applied",
  Interviewing: "status-chip--Interviewing",
  Offer: "status-chip--Offer",
  Rejected: "status-chip--Rejected",
};

const rawClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_ID = typeof rawClientId === "string" ? rawClientId.trim() : "";
const rawAllowedEmail = import.meta.env.VITE_ALLOWED_EMAIL;
const ALLOWED_EMAIL_DISPLAY = typeof rawAllowedEmail === "string" ? rawAllowedEmail.trim() : "";
const ALLOWED_EMAIL = ALLOWED_EMAIL_DISPLAY.toLowerCase();

export default function App() {
  const hasAuthConfig = Boolean(GOOGLE_CLIENT_ID && ALLOWED_EMAIL);

  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("dateDesc");
  const [form, setForm] = useState(makeDefaultForm);
  const [editingId, setEditingId] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");

  const googleButtonRef = useRef(null);

  const storageKey = useMemo(() => {
    if (!user?.email) return null;
    return `job-tracker-items-${user.email.toLowerCase()}`;
  }, [user]);

  const resetForm = useCallback(() => {
    setForm(makeDefaultForm());
    setEditingId(null);
  }, []);

  useEffect(() => {
    if (!hasAuthConfig) {
      setAuthReady(false);
      return;
    }

    const scriptId = "google-identity-services";
    const existing = document.getElementById(scriptId);

    const handleLoad = () => {
      setAuthReady(true);
    };

    if (existing) {
      if (existing.dataset.loaded === "true") {
        setAuthReady(true);
      } else {
        existing.addEventListener("load", handleLoad, { once: true });
      }
      return () => existing.removeEventListener("load", handleLoad);
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      setAuthReady(true);
    };
    script.onerror = () => {
      setAuthError("Failed to load Google authentication. Check your network connection.");
    };
    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", handleLoad);
    };
  }, [hasAuthConfig]);

  const handleCredentialResponse = useCallback(
    (response) => {
      if (!response?.credential) {
        setAuthError("Google authentication failed. Please try again.");
        return;
      }
      const payload = decodeJwt(response.credential);
      if (!payload?.email) {
        setAuthError("Unable to read email from Google credential.");
        return;
      }
      const email = payload.email.toLowerCase();
      if (ALLOWED_EMAIL && email !== ALLOWED_EMAIL) {
        setAuthError(
          `This Google account is not authorized for this tracker. Please sign in with ${ALLOWED_EMAIL_DISPLAY}.`
        );
        window.google?.accounts?.id?.disableAutoSelect?.();
        return;
      }
      setUser({
        email: payload.email,
        name: payload.name || payload.email,
        picture: payload.picture || "",
      });
      setAuthError("");
      window.google?.accounts?.id?.disableAutoSelect?.();
    },
    []
  );

  useEffect(() => {
    if (!hasAuthConfig || !authReady || user) {
      return;
    }
    if (!window.google?.accounts?.id) {
      return;
    }
    if (googleButtonRef.current) {
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        width: "100%",
      });
      window.google.accounts.id.prompt();
    }
  }, [authReady, handleCredentialResponse, hasAuthConfig, user]);

  useEffect(() => {
    if (!storageKey) {
      setItems([]);
      resetForm();
      setQuery("");
      setStatusFilter("All");
      setSortBy("dateDesc");
      return;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        } else {
          setItems([]);
        }
      } else {
        setItems([]);
      }
    } catch (err) {
      console.warn("Failed to parse stored items", err);
      setItems([]);
    }
    resetForm();
    setQuery("");
    setStatusFilter("All");
    setSortBy("dateDesc");
  }, [resetForm, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  const stats = useMemo(() => ({
    total: items.length,
    Applied: items.filter((x) => x.status === "Applied").length,
    Interviewing: items.filter((x) => x.status === "Interviewing").length,
    Offer: items.filter((x) => x.status === "Offer").length,
    Rejected: items.filter((x) => x.status === "Rejected").length,
  }), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const subset = items.filter((it) => {
      const hay = `${it.company} ${it.role} ${it.source} ${it.status} ${it.notes}`.toLowerCase();
      const matchQ = q ? hay.includes(q) : true;
      const matchS = statusFilter === "All" ? true : it.status === statusFilter;
      return matchQ && matchS;
    });
    subset.sort((a, b) => {
      switch (sortBy) {
        case "companyAsc":
          return a.company.localeCompare(b.company);
        case "companyDesc":
          return b.company.localeCompare(a.company);
        case "dateAsc":
          return new Date(a.date) - new Date(b.date);
        case "dateDesc":
          return new Date(b.date) - new Date(a.date);
        default:
          return 0;
      }
    });
    return subset;
  }, [items, query, sortBy, statusFilter]);

  const hiddenCount = useMemo(() => {
    if (!user) return 0;
    return Math.max(0, items.length - filtered.length);
  }, [filtered.length, items.length, user]);

  const handleSignOut = useCallback(() => {
    resetForm();
    setUser(null);
    setItems([]);
    setQuery("");
    setStatusFilter("All");
    setSortBy("dateDesc");
    setAuthError("");
    window.google?.accounts?.id?.disableAutoSelect?.();
  }, [resetForm]);

  function submitForm(e) {
    e.preventDefault();
    const payload = {
      ...form,
      company: form.company.trim(),
      role: form.role.trim(),
      id: editingId ?? crypto.randomUUID(),
    };
    if (!payload.company || !payload.role) {
      alert("Company and Role are required");
      return;
    }
    if (editingId) {
      setItems((prev) => prev.map((it) => (it.id === editingId ? payload : it)));
    } else {
      setItems((prev) => [payload, ...prev]);
    }
    resetForm();
  }

  function editItem(it) {
    setEditingId(it.id);
    setForm(it);
  }

  function removeItem(id) {
    if (confirm("Delete this entry?")) {
      setItems((prev) => prev.filter((it) => it.id !== id));
    }
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(items, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "job-tracker.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    const headers = ["id", "company", "role", "source", "status", "date", "notes"];
    const rows = items.map((it) => headers.map((h) => ("" + (it[h] ?? "")).replaceAll('"', '""')));
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((v) => JSON.stringify(v)).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "job-tracker.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data)) {
          setItems(data);
        } else {
          alert("Invalid JSON format");
        }
      } catch {
        alert("Could not parse JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  if (!hasAuthConfig) {
    return (
      <div className="tracker-page">
        <div className="tracker-shell tracker-shell--auth">
          <section className="section-card login-card">
            <h1>Authentication Setup Required</h1>
            <p>
              Configure Google Sign-In before using the tracker.
              Create a Web OAuth client in the Google Cloud Console and define the
              following environment variables in <code>.env.local</code>:
            </p>
            <ul>
              <li><code>VITE_GOOGLE_CLIENT_ID</code> – OAuth Client ID</li>
              <li><code>VITE_ALLOWED_EMAIL</code> – the only Google account allowed to sign in</li>
            </ul>
          </section>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="tracker-page">
        <div className="tracker-shell tracker-shell--auth">
          <section className="section-card login-card">
            <h1>Secure Access</h1>
            {/* <p>
              Sign in with {ALLOWED_EMAIL_DISPLAY} to unlock your job tracker.
            </p> */}
            <p>
              Sign in with your Gmail ID to unlock your job tracker.
            </p>

            {authError && <p className="auth-error">{authError}</p>}
            <div className="google-button" ref={googleButtonRef} />
            {!authReady && (
              <p className="controls__hint" role="status">
                Loading Google Sign-In...
              </p>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="tracker-page">
      <div className="tracker-shell">
        <section className="tracker-hero">
          <div className="tracker-hero__copy">
            <span className="badge">Gen Z UI x Red Bull Racing Energy</span>
            <h1>Job Tracker Pit Wall</h1>
            <p>
              Monitor every application like a race engineer - adjust strategy, keep
              momentum, and push for the podium offer.
            </p>
          </div>
          <div className="tracker-hero__panel">
            <div className="account-chip">
              {user.picture ? (
                <img src={user.picture} alt="Profile" />
              ) : (
                <div className="account-chip__avatar-fallback" aria-hidden="true">
                  {user.email[0]?.toUpperCase()}
                </div>
              )}
              <div className="account-chip__meta">
                <span className="account-chip__label">Signed in as</span>
                <span className="account-chip__value">{user.name}</span>
                <span className="account-chip__email">{user.email}</span>
              </div>
            </div>
            <div className="button-bar">
              <button onClick={exportJSON} className="button button--primary" type="button">
                Export JSON
              </button>
              <button onClick={exportCSV} className="button button--ghost" type="button">
                Export CSV
              </button>
              <label className="button button--ghost" role="button">
                Import JSON
                <input
                  onChange={importJSON}
                  type="file"
                  accept="application/json"
                  className="track-hidden"
                />
              </label>
              <button onClick={handleSignOut} className="button button--ghost button--sm" type="button">
                Sign out
              </button>
            </div>
          </div>
        </section>

        <section className="tracker-stats section-card">
          {Object.entries(stats).map(([key, value]) => {
            const meta = STAT_META[key] ?? { label: key, chip: "Performance" };
            return (
              <article key={key} className="stat-card">
                <div className="stat-card__label">{meta.label}</div>
                <span className="stat-card__chip">{meta.chip}</span>
                <span className="stat-card__value">{value}</span>
              </article>
            );
          })}
        </section>

        <section className="section-card">
          <div className="controls">
            <div className="controls__row">
              <div className="search-box">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search company, role, or notes"
                  type="search"
                />
              </div>
              <div>
                <span className="controls__hint">Status</span>
                <div className="pill-group">
                  {["All", ...STATUSES].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={classNames(
                        "pill-button",
                        statusFilter === status && "is-active"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="controls__row controls__row--split">
              <div>
                <span className="controls__hint">Sort</span>
                <div className="select-wrap">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="dateDesc">Date (new to old)</option>
                    <option value="dateAsc">Date (old to new)</option>
                    <option value="companyAsc">Company (A to Z)</option>
                    <option value="companyDesc">Company (Z to A)</option>
                  </select>
                </div>
              </div>
              <div className="controls__hint">
                {filtered.length} {filtered.length === 1 ? "result" : "results"} | {hiddenCount} hidden by filters
              </div>
            </div>
          </div>
        </section>

        <section className="section-card">
          <div className="controls__row controls__row--split">
            <h2>{editingId ? "Edit Application" : "Add Application"}</h2>
            {editingId && <span className="badge">Editing mode</span>}
          </div>
          <form onSubmit={submitForm}>
            <div className="form-grid">
              <div>
                <label htmlFor="company-field">Company *</label>
                <input
                  id="company-field"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="role-field">Role *</label>
                <input
                  id="role-field"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="source-field">Source</label>
                <input
                  id="source-field"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  placeholder="LinkedIn, referral, career site"
                />
              </div>
              <div>
                <label htmlFor="status-field">Status</label>
                <select
                  id="status-field"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="date-field">Date</label>
                <input
                  id="date-field"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="form-grid__wide">
                <label htmlFor="notes-field">Notes</label>
                <textarea
                  id="notes-field"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="button button--primary">
                {editingId ? "Save changes" : "Add application"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="button button--ghost"
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="section-card">
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  {["Company", "Role", "Source", "Status", "Date", "Actions"].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      No applications yet - log your first move and start building momentum.
                    </td>
                  </tr>
                ) : (
                  filtered.map((it) => (
                    <tr key={it.id}>
                      <td>{it.company}</td>
                      <td>{it.role}</td>
                      <td>{it.source || "N/A"}</td>
                      <td className={classNames("status-chip", STATUS_ACCENTS[it.status])}>{it.status}</td>
                      <td>{it.date}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            onClick={() => editItem(it)}
                            type="button"
                            className="button button--ghost button--sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => removeItem(it.id)}
                            type="button"
                            className="button button--ghost button--sm button--danger"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="footer">
          Built by Pavan Krishna | React + LocalStorage | Import/Export ready
        </footer>
      </div>
    </div>
  );
}

