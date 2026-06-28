"use client";

import { useState } from "react";
import { useCostCodes, useRateAnalyses, useCreateRateAnalysis } from "@/hooks/useBoq";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Search, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { PermissionGuard } from "@/components/layouts/PermissionGuard";

const UNITS = ["sqm", "cum", "rmt", "nos", "kg", "mt", "lit", "bag", "ls", "day", "hour", "percent"] as const;

const selectClass = "h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400";
const inputClass = "h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 [color-scheme:light] dark:[color-scheme:dark] w-full";

export default function RateAnalysisPage() {
  return (
    <PermissionGuard module="can_boq">
      <RateAnalysisContent />
    </PermissionGuard>
  );
}

function RateAnalysisContent() {
  const [searchCodes, setSearchCodes] = useState("");
  const [selectedCodeId, setSelectedCodeId] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: costCodes } = useCostCodes(searchCodes || undefined);
  const { data: analyses, isLoading } = useRateAnalyses(selectedCodeId);
  const createAnalysis = useCreateRateAnalysis();

  const selectedCode = costCodes?.find(c => c.id === selectedCodeId);

  const [components, setComponents] = useState<Array<{
    component_type: string;
    description: string;
    unit: string;
    quantity: number;
    rate: number;
    wastage_percentage: number;
  }>>([]);

  const addComponent = (type: string) => {
    setComponents(prev => [...prev, {
      component_type: type,
      description: "",
      unit: "nos",
      quantity: 1,
      rate: 0,
      wastage_percentage: 0,
    }]);
  };

  const updateComponent = (index: number, field: string, value: string | number) => {
    setComponents(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const removeComponent = (index: number) => {
    setComponents(prev => prev.filter((_, i) => i !== index));
  };

  const { register, handleSubmit, reset, watch } = useForm();
  const watchUnit = watch("unit");

  const subtotal = components.reduce((sum, c) => sum + c.quantity * c.rate * (1 + c.wastage_percentage / 100), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rate Analysis</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Break down unit rates for cost codes</p>
        </div>
      </div>

      {/* Cost code selector */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Cost code</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search cost codes..."
                  className="pl-9 mb-2"
                  value={searchCodes}
                  onChange={e => setSearchCodes(e.target.value)}
                />
              </div>
              <select
                className={selectClass}
                value={selectedCodeId}
                onChange={e => { setSelectedCodeId(e.target.value); setShowForm(false); }}
              >
                <option value="">Select a cost code...</option>
                {costCodes?.map(cc => (
                  <option key={cc.id} value={cc.id}>{cc.code} — {cc.name}</option>
                ))}
              </select>
            </div>
            {selectedCodeId && (
              <Button onClick={() => setShowForm(!showForm)} size="sm">
                <Plus className="h-4 w-4 mr-1" /> New Rate Analysis
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* New analysis form */}
      {showForm && selectedCode && (
        <Card className="dark:bg-gray-900 dark:border-gray-800 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100 text-base">
              New Rate Analysis for {selectedCode.code}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(async (d) => {
                await createAnalysis.mutateAsync({
                  cost_code_id: selectedCodeId,
                  name: d.name,
                  description: d.description,
                  unit: d.unit || "nos",
                  output_quantity: parseFloat(d.output_quantity) || 1,
                  overhead_percentage: parseFloat(d.overhead_percentage) || 10,
                  components: components.map(c => ({
                    ...c,
                    quantity: c.quantity || 0,
                    rate: c.rate || 0,
                    wastage_percentage: c.wastage_percentage || 0,
                  })),
                });
                reset();
                setComponents([]);
                setShowForm(false);
              })}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Name</label>
                  <input className={inputClass} placeholder="Earthwork Rate" {...register("name", { required: true })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <input className={inputClass} placeholder="Optional" {...register("description")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Unit</label>
                  <select className={selectClass} {...register("unit")}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Output Qty</label>
                  <input className={inputClass} type="number" defaultValue={1} {...register("output_quantity")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Overhead %</label>
                  <input className={inputClass} type="number" defaultValue={10} {...register("overhead_percentage")} />
                </div>
              </div>

              {/* Components */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Components</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => addComponent("material")}>
                    + Material
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => addComponent("labour")}>
                    + Labour
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => addComponent("equipment")}>
                    + Equipment
                  </Button>
                </div>
                {components.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">Add at least one material, labour, or equipment component</p>
                )}
                {components.map((comp, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <Badge status={comp.component_type} className="w-20 text-center capitalize" />
                    <input
                      className={`${inputClass} flex-1`}
                      placeholder="Description"
                      value={comp.description}
                      onChange={e => updateComponent(i, "description", e.target.value)}
                    />
                    <select className={`${selectClass} w-20`} value={comp.unit} onChange={e => updateComponent(i, "unit", e.target.value)}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <input className={`${inputClass} w-20`} type="number" placeholder="Qty" value={comp.quantity || ""} onChange={e => updateComponent(i, "quantity", parseFloat(e.target.value) || 0)} />
                    <input className={`${inputClass} w-24`} type="number" placeholder="Rate" value={comp.rate || ""} onChange={e => updateComponent(i, "rate", parseFloat(e.target.value) || 0)} />
                    <input className={`${inputClass} w-16`} type="number" placeholder="Waste%" value={comp.wastage_percentage || ""} onChange={e => updateComponent(i, "wastage_percentage", parseFloat(e.target.value) || 0)} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24 text-right">
                      {(comp.quantity * comp.rate * (1 + comp.wastage_percentage / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <button type="button" onClick={() => removeComponent(i)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Subtotal: {subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} |
                  Overhead ({watch("overhead_percentage") || 10}%): {(subtotal * (parseFloat(watch("overhead_percentage") || "10")) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} |
                  <strong className="text-gray-900 dark:text-gray-100 ml-1">
                    Unit Rate: {(subtotal * (1 + (parseFloat(watch("overhead_percentage") || "10")) / 100) / (parseFloat(watch("output_quantity") || "1"))).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </strong>
                </div>
                <Button type="submit" loading={createAnalysis.isPending} size="sm">Create Rate Analysis</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Existing analyses */}
      {selectedCodeId && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">{analyses?.length ?? 0} rate analyses for {selectedCode?.code}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-right">Unit</th>
                    <th className="px-4 py-3 text-right">Output</th>
                    <th className="px-4 py-3 text-right">Material</th>
                    <th className="px-4 py-3 text-right">Labour</th>
                    <th className="px-4 py-3 text-right">Equipment</th>
                    <th className="px-4 py-3 text-right">Overhead</th>
                    <th className="px-4 py-3 text-right">Unit Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" />
                      </td>
                    </tr>
                  ) : analyses?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-gray-400 dark:text-gray-500">
                        No rate analyses yet
                      </td>
                    </tr>
                  ) : analyses?.map(ra => (
                    <tr key={ra.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div className="text-gray-900 dark:text-gray-100 font-medium">{ra.name}</div>
                        {ra.description && <div className="text-xs text-gray-500">{ra.description}</div>}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{ra.unit}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{ra.output_quantity}</td>
                      <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">{ra.total_material.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{ra.total_labour.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">{ra.total_equipment.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{ra.overhead_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">{ra.unit_rate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Components for selected analysis - we show these inline */}
      {selectedCodeId && analyses?.map(ra => ra.components.length > 0 && (
        <Card key={`components-${ra.id}`} className="dark:bg-gray-900 dark:border-gray-800 ml-4 border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-sm dark:text-gray-100">Components: {ra.name}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-right">Unit</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Rate</th>
                  <th className="px-4 py-2 text-right">Waste %</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {ra.components.map(comp => (
                  <tr key={comp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-2"><Badge status={comp.component_type} className="capitalize" /></td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{comp.description}</td>
                    <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">{comp.unit}</td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{comp.quantity}</td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{comp.rate.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{comp.wastage_percentage}%</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-gray-100">{comp.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
