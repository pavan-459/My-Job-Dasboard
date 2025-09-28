import React, { useEffect, useMemo, useState } from "react";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

const DEFAULT_FORM = {
  id: null,
  company: "",
  role: "",
  source: "",
  status: "Applied",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

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

export default function App() {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("job-tracker-items") || "[]");
    } catch {
      return [];
    }
  });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("dateDesc");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    localStorage.setItem("job-tracker-items", JSON.stringify(items));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = items.filter((it) => {
      const hay = (it.company || "").toLowerCase();
      const matchQ = q ? hay.includes(q) : true;
      const matchS = statusFilter === "All" ? true : it.status === statusFilter;
      return matchQ && matchS;
    });
    out.sort((a, b) => {
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
    return out;
  }, [items, query, statusFilter, sortBy]);

  const stats = useMemo(
    () => ({
      total: items.length,
      Applied: items.filter((x) => x.status === "Applied").length,
      Interviewing: items.filter((x) => x.status === "Interviewing").length,
      Offer: items.filter((x) => x.status === "Offer").length,
      Rejected: items.filter((x) => x.status === "Rejected").length,
    }),
    [items]
  );

  const hiddenCount = Math.max(0, items.length - filtered.length);

  function resetForm() {
    setForm(DEFAULT_FORM);
    setEditingId(null);
  }

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
      setItems((prev) =>
        prev.map((it) => (it.id === editingId ? payload : it))
      );
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
    const headers = [
      "id",
      "company",
      "role",
      "source",
      "status",
      "date",
      "notes",
    ];
    const rows = items.map((it) =>
      headers.map((h) => ("" + (it[h] ?? "")).replaceAll('"', '""'))
    );
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
  }

  return (
    <div className="tracker-page">
      <div className="tracker-shell">
        <section className="tracker-hero">
          <div className="tracker-hero__copy">
            <span className="badge">Powered By Red Bull Racing </span>
            <h1>Job Tracker Pit Wall</h1>
            <p>
              Monitor every application like a race engineer - adjust strategy,
              keep momentum, and push for the podium offer.
            </p>
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
                {filtered.length} {filtered.length === 1 ? "result" : "results"} | {" "}
                {hiddenCount} hidden by filters
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
                  {["Company", "Role", "Source", "Status", "Date", "Actions"].map(
                    (heading) => (
                      <th key={heading}>{heading}</th>
                    )
                  )}
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
                      <td
                        className={classNames(
                          "status-chip",
                          STATUS_ACCENTS[it.status]
                        )}
                      >
                        {it.status}
                      </td>
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

