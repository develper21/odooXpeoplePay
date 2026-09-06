"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Building2,
  Calendar,
  Clock,
  Globe,
  Lock,
  Save,
  Shield,
  Sliders,
  Wallet,
} from "lucide-react";
import { useSettings, useUpdateSettings } from "@/hooks/use-data";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import type { SystemSettings } from "@/types/domain";

type TabKey = "organization" | "general" | "payroll" | "notifications";

export default function SettingsPage() {
  const { data: settings, isLoading, isError } = useSettings();
  const updateMutation = useUpdateSettings();

  const [activeTab, setActiveTab] = useState<TabKey>("organization");
  const [formData, setFormData] = useState<SystemSettings | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData(JSON.parse(JSON.stringify(settings)));
    }
  }, [settings]);

  if (isLoading) return <LoadingState />;
  if (isError || !formData)
    return <ErrorState message="System settings could not be loaded." />;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMutation.mutateAsync(formData);
    setToastMessage("System settings updated successfully.");
  };

  const updateOrg = (
    field: keyof SystemSettings["organization"],
    value: any,
  ) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            organization: { ...prev.organization, [field]: value },
          }
        : null,
    );
  };

  const updateGen = (field: keyof SystemSettings["general"], value: any) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            general: { ...prev.general, [field]: value },
          }
        : null,
    );
  };

  const updatePayroll = (
    field: keyof SystemSettings["payrollSecurity"],
    value: any,
  ) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            payrollSecurity: { ...prev.payrollSecurity, [field]: value },
          }
        : null,
    );
  };

  const updateNotif = (
    field: keyof SystemSettings["notifications"],
    value: any,
  ) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            notifications: { ...prev.notifications, [field]: value },
          }
        : null,
    );
  };

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}

      <PageHeader
        title="Workspace Settings"
        description="Configure enterprise organization profiles, payroll calculation standards, and notifications."
      />

      {/* Tabs navigation */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-border-subtle pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("organization")}
          className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === "organization"
              ? "bg-primary text-white"
              : "bg-surface text-text-secondary hover:bg-surface-raised hover:text-text-primary"
          }`}
        >
          <Building2 className="size-3.5" /> Organization
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === "general"
              ? "bg-primary text-white"
              : "bg-surface text-text-secondary hover:bg-surface-raised hover:text-text-primary"
          }`}
        >
          <Sliders className="size-3.5" /> General & Regional
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payroll")}
          className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === "payroll"
              ? "bg-primary text-white"
              : "bg-surface text-text-secondary hover:bg-surface-raised hover:text-text-primary"
          }`}
        >
          <Wallet className="size-3.5" /> Payroll & Security
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === "notifications"
              ? "bg-primary text-white"
              : "bg-surface text-text-secondary hover:bg-surface-raised hover:text-text-primary"
          }`}
        >
          <Bell className="size-3.5" /> Notifications
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tab 1: Organization */}
        {activeTab === "organization" && (
          <Card>
            <CardHeader>
              <CardTitle>Organization Profile</CardTitle>
              <p className="mt-1 text-xs text-text-muted">
                Official entity details printed on generated payslips and
                compliance returns.
              </p>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-text-secondary">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.organization.companyName}
                  onChange={(e) => updateOrg("companyName", e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary">
                  Legal Registered Name
                </label>
                <input
                  type="text"
                  value={formData.organization.legalName}
                  onChange={(e) => updateOrg("legalName", e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary">
                  Work Email
                </label>
                <input
                  type="email"
                  value={formData.organization.email}
                  onChange={(e) => updateOrg("email", e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary">
                  Support Phone
                </label>
                <input
                  type="text"
                  value={formData.organization.phone}
                  onChange={(e) => updateOrg("phone", e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary">
                  Tax ID / GSTIN
                </label>
                <input
                  type="text"
                  value={formData.organization.taxId}
                  onChange={(e) => updateOrg("taxId", e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary">
                  Fiscal Year Starting Date
                </label>
                <input
                  type="date"
                  value={formData.organization.fiscalYearStart}
                  onChange={(e) => updateOrg("fiscalYearStart", e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary">
                  Default Currency
                </label>
                <select
                  value={formData.organization.currency}
                  onChange={(e) => updateOrg("currency", e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary">
                  Standard Timezone
                </label>
                <select
                  value={formData.organization.timezone}
                  onChange={(e) => updateOrg("timezone", e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="Asia/Kolkata">
                    Asia/Kolkata (IST +05:30)
                  </option>
                  <option value="UTC">UTC (+00:00)</option>
                  <option value="America/New_York">
                    America/New_York (EST -05:00)
                  </option>
                  <option value="Europe/London">
                    Europe/London (GMT +00:00)
                  </option>
                </select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 2: General & Regional */}
        {activeTab === "general" && (
          <Card>
            <CardHeader>
              <CardTitle>Regional & Working Defaults</CardTitle>
              <p className="mt-1 text-xs text-text-muted">
                Display formats and base calculations for schedules and
                attendance.
              </p>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-text-secondary">
                  Date Display Format
                </label>
                <select
                  value={formData.general.dateFormat}
                  onChange={(e) => updateGen("dateFormat", e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="DD/MM/YYYY">
                    DD/MM/YYYY (e.g. 21/09/2026)
                  </option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (US standard)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary">
                  Time Format
                </label>
                <select
                  value={formData.general.timeFormat}
                  onChange={(e) => updateGen("timeFormat", e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="24h">24 Hours (e.g. 17:30)</option>
                  <option value="12h">12 Hours (e.g. 05:30 PM)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary">
                  Standard Working Days / Week
                </label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={formData.general.workingDaysPerWeek}
                  onChange={(e) =>
                    updateGen("workingDaysPerWeek", Number(e.target.value))
                  }
                  className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary">
                  Daily Working Hours Benchmark
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={formData.general.standardDailyHours}
                  onChange={(e) =>
                    updateGen("standardDailyHours", Number(e.target.value))
                  }
                  className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 3: Payroll & Security */}
        {activeTab === "payroll" && (
          <Card>
            <CardHeader>
              <CardTitle>Payroll Cut-offs & Security Rules</CardTitle>
              <p className="mt-1 text-xs text-text-muted">
                Cycle deadlines and authentication security requirements.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-text-secondary">
                    Monthly Payroll Cut-off Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.payrollSecurity.cutoffDay}
                    onChange={(e) =>
                      updatePayroll("cutoffDay", Number(e.target.value))
                    }
                    className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-text-muted">
                    Day of each month when attendance logs freeze.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary">
                    Overtime Hourly Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="3.0"
                    value={formData.payrollSecurity.overtimeMultiplier}
                    onChange={(e) =>
                      updatePayroll(
                        "overtimeMultiplier",
                        Number(e.target.value),
                      )
                    }
                    className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-text-muted">
                    Standard rate multiplier applied to overtime hours (e.g.
                    1.5x).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary">
                    Session Inactivity Timeout (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    value={formData.payrollSecurity.sessionTimeoutMinutes}
                    onChange={(e) =>
                      updatePayroll(
                        "sessionTimeoutMinutes",
                        Number(e.target.value),
                      )
                    }
                    className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.payrollSecurity.requireTwoFactor}
                    onChange={(e) =>
                      updatePayroll("requireTwoFactor", e.target.checked)
                    }
                    className="size-4 rounded border-border-strong bg-surface text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-semibold text-text-primary">
                      Enforce Two-Factor Authentication (2FA)
                    </span>
                    <p className="text-xs text-text-muted">
                      Requires TOTP confirmation for admin and payroll
                      processing roles.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.payrollSecurity.autoPayslipEmail}
                    onChange={(e) =>
                      updatePayroll("autoPayslipEmail", e.target.checked)
                    }
                    className="size-4 rounded border-border-strong bg-surface text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-semibold text-text-primary">
                      Automatic Payslip Emailing
                    </span>
                    <p className="text-xs text-text-muted">
                      Automatically email payslips upon payrun Mark Paid action.
                    </p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 4: Notifications */}
        {activeTab === "notifications" && (
          <Card>
            <CardHeader>
              <CardTitle>System Notification Preferences</CardTitle>
              <p className="mt-1 text-xs text-text-muted">
                Configure event alerts for key HR, payroll, and compliance
                milestones.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifications.notifyOnPayrunFinalize}
                  onChange={(e) =>
                    updateNotif("notifyOnPayrunFinalize", e.target.checked)
                  }
                  className="size-4 rounded border-border-strong bg-surface text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-semibold text-text-primary">
                    Payrun Finalization Alerts
                  </span>
                  <p className="text-xs text-text-muted">
                    Send email notification to Finance Admins when a payrun is
                    validated or paid.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifications.notifyOnLeaveRequest}
                  onChange={(e) =>
                    updateNotif("notifyOnLeaveRequest", e.target.checked)
                  }
                  className="size-4 rounded border-border-strong bg-surface text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-semibold text-text-primary">
                    Time Off Workflow Alerts
                  </span>
                  <p className="text-xs text-text-muted">
                    Notify reporting managers when employees submit leave or
                    allocation requests.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifications.notifyOnContractExpiry}
                  onChange={(e) =>
                    updateNotif("notifyOnContractExpiry", e.target.checked)
                  }
                  className="size-4 rounded border-border-strong bg-surface text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-semibold text-text-primary">
                    Contract Expiration Warnings
                  </span>
                  <p className="text-xs text-text-muted">
                    Generate operational alerts when employee contracts are
                    approaching renewal date.
                  </p>
                </div>
              </label>

              <div className="pt-3 border-t max-w-xs">
                <label className="block text-xs font-medium text-text-secondary">
                  Contract Expiry Advance Warning (Days)
                </label>
                <input
                  type="number"
                  min="7"
                  max="180"
                  value={formData.notifications.contractExpiryWarningDays}
                  onChange={(e) =>
                    updateNotif(
                      "contractExpiryWarningDays",
                      Number(e.target.value),
                    )
                  }
                  className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            busy={updateMutation.isPending}
            className="gap-2"
          >
            <Save className="size-4" /> Save System Settings
          </Button>
        </div>
      </form>
    </>
  );
}
