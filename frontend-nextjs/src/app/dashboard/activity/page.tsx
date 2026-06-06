// src/app/dashboard/activity/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Activity as ActivityIcon,
  Download,
  Upload,
  Share2,
  Trash2,
  ShieldCheck,
  KeyRound,
  LogIn,
  UserPlus,
} from "lucide-react";
import { api } from "@/lib/api";
import { AuditLog } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

const ACTION_MAP: Record<
  string,
  { icon: React.ReactNode; color: string }
> = {
  UPLOAD:          { icon: <Upload    className="w-5 h-5 text-green-600"  />, color: "bg-green-50 border-green-200"   },
  DOWNLOAD:        { icon: <Download  className="w-5 h-5 text-blue-600"   />, color: "bg-blue-50 border-blue-200"     },
  SHARE:           { icon: <Share2    className="w-5 h-5 text-purple-600" />, color: "bg-purple-50 border-purple-200" },
  DELETE:          { icon: <Trash2    className="w-5 h-5 text-red-600"    />, color: "bg-red-50 border-red-200"       },
  ROLE_CHANGE:     { icon: <ShieldCheck className="w-5 h-5 text-orange-600" />, color: "bg-orange-50 border-orange-200" },
  PASSWORD_CHANGE: { icon: <KeyRound  className="w-5 h-5 text-yellow-600" />, color: "bg-yellow-50 border-yellow-200" },
  LOGIN:           { icon: <LogIn     className="w-5 h-5 text-navy-600"   />, color: "bg-navy-50 border-navy-200"     },
  REGISTER:        { icon: <UserPlus  className="w-5 h-5 text-emerald-600" />, color: "bg-emerald-50 border-emerald-200" },
};

const DEFAULT_ACTION = {
  icon:  <ActivityIcon className="w-5 h-5 text-navy-600" />,
  color: "bg-gray-50 border-gray-200",
};

export default function ActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const logList = await api.getLogs();
        setLogs(logList);
      } catch (error) {
        console.error("Error loading logs:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();

    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-navy-200 border-t-navy-900 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-navy-900 mb-2">Activity Log</h1>
        <p className="text-navy-600">All system activities and audit trail</p>
      </div>

      <div className="space-y-4">
        {logs.length === 0 ? (
          <div className="text-center py-16 card">
            <ActivityIcon className="w-16 h-16 text-navy-200 mx-auto mb-4" />
            <p className="text-navy-600 text-lg">No activity yet</p>
          </div>
        ) : (
          logs.map((log, index) => {
            const timestamp = new Date(log.timestamp);
            const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });
            const { icon, color } = ACTION_MAP[log.action] ?? DEFAULT_ACTION;

            return (
              <div
                key={log.id}
                className={`card p-6 border-l-4 hover:shadow-navy-md transition-all duration-300 animate-fadeIn ${color}`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-white flex-shrink-0">
                    {icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-block px-3 py-1 bg-white rounded-full text-sm font-semibold text-navy-900">
                        {log.action}
                      </span>
                      <span className="text-xs text-navy-500">
                        {timestamp.toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="text-navy-700 mb-2">{log.details}</p>

                    <div className="flex items-center gap-4 text-xs text-navy-600">
                      <span>👤 {log.username || "System"}</span>
                      <span>🕐 {timeAgo}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="card p-6 bg-navy-50 border border-navy-200">
        <div className="flex items-start gap-4">
          <div className="text-3xl">📋</div>
          <div>
            <h3 className="font-semibold text-navy-900 mb-2">Activity Log</h3>
            <p className="text-navy-600 text-sm">
              Complete audit trail of all activities. All file operations are
              logged with timestamps for security and compliance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
