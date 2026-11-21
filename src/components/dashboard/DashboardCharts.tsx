"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

interface DashboardChartsProps {
  categoryData: Array<{
    name: string;
    units: number;
    value: number; // in rupees
  }>;
}

const COLORS = [
  "#2563eb",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
];

export function DashboardCharts({ categoryData }: DashboardChartsProps) {
  const [metric, setMetric] = useState<"units" | "value">("units");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Category Distribution Bar Chart */}
      <div className="lg:col-span-2 p-5 rounded-xl bg-card border border-border shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
          <div>
            <h2 className="font-bold text-sm text-foreground">
              Inventory by Category
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Stock breakdown across 8 peripheral categories
            </p>
          </div>
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setMetric("units")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                metric === "units"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Physical Units
            </button>
            <button
              onClick={() => setMetric("value")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                metric === "value"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cost Valuation (₹)
            </button>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryData}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "currentColor" }}
                angle={-25}
                textAnchor="end"
                interval={0}
                stroke="#888888"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "currentColor" }}
                stroke="#888888"
                tickFormatter={(val) =>
                  metric === "value" ? `₹${(val / 1000).toFixed(0)}k` : val
                }
              />
              <Tooltip
                formatter={(val: any) => [
                  metric === "value"
                    ? new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                      }).format(val)
                    : `${val} units`,
                  metric === "value" ? "Total Valuation (Cost)" : "Stock Units",
                ]}
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#fff",
                }}
              />
              <Bar dataKey={metric} radius={[4, 4, 0, 0]}>
                {categoryData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Share Donut */}
      <div className="p-5 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
        <div className="mb-4 pb-2 border-b border-border">
          <h2 className="font-bold text-sm text-foreground">Volume Distribution</h2>
          <p className="text-[11px] text-muted-foreground">
            Share of physical stock
          </p>
        </div>

        <div className="h-48 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="units"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
              >
                {categoryData.map((_, index) => (
                  <Cell
                    key={`pie-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: any) => [`${val} units`, "Stock"]}
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#fff",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
          {categoryData.slice(0, 6).map((c, idx) => (
            <div key={c.name} className="flex items-center gap-1.5 truncate">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span className="truncate">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
