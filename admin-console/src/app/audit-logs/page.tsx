"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface AuditLogItem {
  id: string;
  created_at: string;
  actor_email?: string;
  actor_name?: string;
  action_type: string;
  action_description?: string;
  target_entity_type?: string;
  target_entity_id?: string;
  target_name?: string;
  old_state: any;
  new_state: any;
  correlation_id?: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPruneModal, setShowPruneModal] = useState(false);
  const [pruneDays, setPruneDays] = useState(30);
  const [isPruning, setIsPruning] = useState(false);
  const [pruneResultMsg, setPruneResultMsg] = useState("");

  const fetchLogs = () => {
    setLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${backendUrl}/api/v1/activity_log`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLogs(data.map((item: any) => ({
            id: item.id,
            created_at: item.created_at,
            actor_name: item.actor_name,
            action_type: item.action,
            action_description: `${item.action} on ${item.entity_type}`,
            target_entity_type: item.entity_type,
            target_entity_id: item.entity_id,
            old_state: item.metadata,
            new_state: item.metadata
          })));
        }
        setLoading(false);
      })
      .catch(() => {
        fetch("/api/audit-logs")
          .then((res) => res.json())
          .then((data) => {
            if (data && Array.isArray(data.audit_logs)) setLogs(data.audit_logs);
            else if (Array.isArray(data)) setLogs(data);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handlePruneLogs = async () => {
    setIsPruning(true);
    setPruneResultMsg("");
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/v1/activity_log/prune`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days_older_than: pruneDays })
      });
      const data = await res.json();
      if (res.ok) {
        setPruneResultMsg(`Successfully pruned ${data.deleted_count || 0} activity logs.`);
        fetchLogs();
      } else {
        setPruneResultMsg(`Error: ${data.detail || "Failed to prune logs"}`);
      }
    } catch (e: any) {
      setPruneResultMsg(`Error: ${e.message}`);
    } finally {
      setIsPruning(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (l.actor_email || "").toLowerCase().includes(term) ||
      (l.actor_name || "").toLowerCase().includes(term) ||
      (l.action_type || "").toLowerCase().includes(term) ||
      (l.action_description || "").toLowerCase().includes(term) ||
      (l.target_entity_type || "").toLowerCase().includes(term) ||
      (l.target_name || "").toLowerCase().includes(term) ||
      (l.correlation_id || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="text-xs uppercase font-mono tracking-wider text-neutral-400 hover:text-white transition-colors"
              >
                &larr; Dashboard
              </Link>
              <span className="text-neutral-700">|</span>
              <h1 className="text-xl font-bold tracking-tight text-white">Security & Audit Log Explorer</h1>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Real-time immutable security audit trail of recruiter operations, auth events, and access logs.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search user email, action, or entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 placeholder-neutral-500 w-full sm:w-80 focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              onClick={() => {
                setPruneResultMsg("");
                setShowPruneModal(true);
              }}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs uppercase font-bold rounded transition-colors whitespace-nowrap cursor-pointer shadow-sm"
            >
              Prune Logs
            </button>
          </div>
        </div>

        {showPruneModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-lg max-w-md w-full space-y-4">
              <h3 className="text-base font-bold text-white font-mono">Prune Activity & Audit Logs</h3>
              <p className="text-xs text-neutral-400">
                Select retention cutoff threshold to delete past activity logs to optimize memory and storage space.
              </p>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Retention Period</label>
                <select
                  value={pruneDays}
                  onChange={(e) => setPruneDays(Number(e.target.value))}
                  className="w-full p-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-neutral-200 focus:outline-none focus:border-amber-500 font-mono"
                >
                  <option value={7}>Older than 7 Days</option>
                  <option value={30}>Older than 30 Days (1 Month)</option>
                  <option value={90}>Older than 90 Days (3 Months)</option>
                  <option value={180}>Older than 180 Days (6 Months)</option>
                  <option value={365}>Older than 365 Days (1 Year)</option>
                  <option value={0}>All Historical Logs (0 Days)</option>
                </select>
              </div>

              {pruneResultMsg && (
                <div className={`p-3 rounded text-xs border ${pruneResultMsg.startsWith("Error") ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"}`}>
                  {pruneResultMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowPruneModal(false)}
                  className="px-3.5 py-1.5 border border-neutral-800 rounded text-xs text-neutral-300 hover:bg-neutral-900 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handlePruneLogs}
                  disabled={isPruning}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold uppercase rounded disabled:opacity-50 cursor-pointer"
                >
                  {isPruning ? "Pruning..." : "Confirm Prune"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-xs text-neutral-500 font-mono">
            Fetching security audit log stream...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-xs text-neutral-500 font-mono border border-dashed border-neutral-800 rounded p-8">
            No audit log entries recorded yet for this organization.
          </div>
        ) : (
          <div className="border border-neutral-800 rounded overflow-hidden bg-neutral-950/60 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 font-mono uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Actor / User</th>
                  <th className="p-3.5">Action Type</th>
                  <th className="p-3.5">Target Resource</th>
                  <th className="p-3.5 text-right">State Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300 font-mono">
                {filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-neutral-900/50 transition-colors">
                      <td className="p-3.5 text-neutral-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-3.5 font-medium text-neutral-200">
                        {log.actor_name || log.actor_email || "system"}
                        {log.actor_email && log.actor_name && (
                          <span className="block text-[10px] text-neutral-500 font-normal">{log.actor_email}</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded text-[10px] font-bold uppercase tracking-wider">
                          {log.action_type}
                        </span>
                      </td>
                      <td className="p-3.5 text-neutral-400">
                        <div className="font-semibold text-neutral-300">
                          {log.action_description || log.target_name || log.target_entity_type || "Resource Operation"}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {log.target_entity_type && <span className="uppercase">{log.target_entity_type}</span>}
                          {log.target_entity_id && <span> ({log.target_entity_id.substring(0, 8)})</span>}
                        </div>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          className="text-amber-400 hover:text-amber-300 text-[11px] font-semibold cursor-pointer underline"
                        >
                          {expandedId === log.id ? "Hide Payload" : "View Payload"}
                        </button>
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr className="bg-neutral-900/90">
                        <td colSpan={5} className="p-4 border-t border-b border-neutral-800">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                            <div>
                              <span className="font-bold text-red-400 uppercase tracking-wider block mb-1 font-mono text-[10px]">
                                Previous State (OLD)
                              </span>
                              <pre className="bg-neutral-950 text-red-300 border border-neutral-800 p-3 rounded overflow-x-auto text-[10px] max-h-52 font-mono">
                                {log.old_state ? JSON.stringify(log.old_state, null, 2) : "null (INSERT)"}
                              </pre>
                            </div>
                            <div>
                              <span className="font-bold text-emerald-400 uppercase tracking-wider block mb-1 font-mono text-[10px]">
                                New State (NEW)
                              </span>
                              <pre className="bg-neutral-950 text-emerald-300 border border-neutral-800 p-3 rounded overflow-x-auto text-[10px] max-h-52 font-mono">
                                {log.new_state ? JSON.stringify(log.new_state, null, 2) : "null (DELETE)"}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
