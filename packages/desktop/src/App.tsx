import React from 'react';
import {
  Server,
  Activity,
  Users,
  FileText,
  Terminal,
  ShieldAlert,
  Sliders,
  LogOut,
  RefreshCw,
  Cpu,
  Layers,
  AlertOctagon,
  CheckCircle,
  Clock,
  Shield,
  Zap,
} from 'lucide-react';
import { api } from './services/api';
import { DashboardMetrics, ServerRecord, AgentRecord, CustomerRecord, ContractRecord } from '@tcc/shared';

export function App() {
  const [token, setToken] = React.useState<string | null>(api.getToken());
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [usernameInput, setUsernameInput] = React.useState('admin');
  const [passwordInput, setPasswordInput] = React.useState('Tropical2026!');
  const [loginError, setLoginError] = React.useState<string | null>(null);

  const [activeTab, setActiveTab] = React.useState<
    'dashboard' | 'servers' | 'provisioning' | 'agents' | 'customers' | 'contracts' | 'remote' | 'incidents' | 'audit'
  >('dashboard');

  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);
  const [servers, setServers] = React.useState<ServerRecord[]>([]);
  const [jobs, setJobs] = React.useState<any[]>([]);
  const [agents, setAgents] = React.useState<AgentRecord[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRecord[]>([]);
  const [contracts, setContracts] = React.useState<ContractRecord[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);
  const [incidents, setIncidents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Modals state
  const [showProvModal, setShowProvModal] = React.useState(false);
  const [provForm, setProvForm] = React.useState({
    customerId: '',
    provider: 'equinix_metal',
    targetHostname: 'node-dedicated-01.tropical.internal',
    targetOs: 'Ubuntu 22.04 LTS',
    planId: 'c3.medium.x86',
    location: 'da',
  });

  const [showEnforceModal, setShowEnforceModal] = React.useState(false);
  const [enforceContractId, setEnforceContractId] = React.useState('');
  const [enforceActionType, setEnforceActionType] = React.useState<string>('GRACE_PERIOD_NOTICE');
  const [enforceReason, setEnforceReason] = React.useState('');
  const [enforceGraceDays, setEnforceGraceDays] = React.useState(7);

  const [showIncidentModal, setShowIncidentModal] = React.useState(false);
  const [incForm, setIncForm] = React.useState({
    title: '',
    severity: 'MEDIUM',
    description: '',
  });

  const [selectedAgentId, setSelectedAgentId] = React.useState<string>('');
  const [remoteCommand, setRemoteCommand] = React.useState<string>('GET_DIAGNOSTICS');
  const [remoteOutput, setRemoteOutput] = React.useState<string>('');

  const refreshData = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [m, s, j, a, c, cnt, l, inc] = await Promise.all([
        api.getDashboardMetrics().catch(() => null),
        api.getServers().catch(() => []),
        api.getProvisioningJobs().catch(() => []),
        api.getAgents().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getContracts().catch(() => []),
        api.getAuditLogs().catch(() => []),
        api.getIncidents().catch(() => []),
      ]);
      setMetrics(m);
      setServers(s);
      setJobs(j);
      setAgents(a);
      setCustomers(c);
      setContracts(cnt);
      setAuditLogs(l);
      setIncidents(inc);
      if (a.length > 0 && !selectedAgentId) {
        setSelectedAgentId(a[0].id);
      }
      if (c.length > 0 && !provForm.customerId) {
        setProvForm((prev) => ({ ...prev, customerId: c[0].id }));
      }
    } finally {
      setLoading(false);
    }
  }, [token, selectedAgentId, provForm.customerId]);

  React.useEffect(() => {
    if (token) {
      refreshData();
      const interval = setInterval(refreshData, 10000);
      return () => clearInterval(interval);
    }
  }, [token, refreshData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await api.login(usernameInput, passwordInput);
      api.setToken(res.token);
      setToken(res.token);
      setCurrentUser(res.user);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:4000/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${api.getToken()}`,
        },
      });
    } catch (e) {}
    api.setToken(null);
    setToken(null);
    setCurrentUser(null);
  };

  const handleQueueProvisioning = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.queueProvisioningJob(provForm);
      setShowProvModal(false);
      refreshData();
    } catch (err: any) {
      alert(`Provisioning error: ${err.message}`);
    }
  };

  const handleExecuteEnforcement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:4000/api/v1/management/contracts/enforce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${api.getToken()}`,
        },
        body: JSON.stringify({
          contractId: enforceContractId,
          actionType: enforceActionType,
          reason: enforceReason,
          gracePeriodDays: Number(enforceGraceDays),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to execute enforcement');
      }
      setShowEnforceModal(false);
      setEnforceReason('');
      refreshData();
    } catch (err: any) {
      alert(`Service Enforcement error: ${err.message}`);
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:4000/api/v1/admin/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${api.getToken()}`,
        },
        body: JSON.stringify(incForm),
      });
      if (!res.ok) throw new Error('Failed to record incident');
      setShowIncidentModal(false);
      setIncForm({ title: '', severity: 'MEDIUM', description: '' });
      refreshData();
    } catch (err: any) {
      alert(`Incident error: ${err.message}`);
    }
  };

  const handleRevokeAgent = async (agentId: string) => {
    if (!confirm(`Are you sure you want to revoke credentials for agent ${agentId}?`)) return;
    try {
      await fetch(`http://localhost:4000/api/v1/agent/agents/${agentId}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${api.getToken()}` },
      });
      refreshData();
    } catch (err: any) {
      alert(`Revocation error: ${err.message}`);
    }
  };

  const handleExecuteRemote = async () => {
    if (!selectedAgentId) return;
    setRemoteOutput('Dispatching command to agent...');
    try {
      const res = await api.executeRemoteOp({
        agentId: selectedAgentId,
        commandType: remoteCommand,
        isDisruptive: remoteCommand === 'RESTART_SERVICE',
        confirmationAcknowledged: true,
      });
      setRemoteOutput(res.output || res.error || 'Execution finished.');
      refreshData();
    } catch (err: any) {
      setRemoteOutput(`Command error: ${err.message}`);
    }
  };

  if (!token) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0b1220]">
        <div className="w-full max-w-md bg-[#111827] border border-[#1e293b] rounded-lg p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded bg-[#14b8a6]/20 border border-[#14b8a6] flex items-center justify-center">
              <Layers className="text-[#14b8a6] h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Tropical Control Center</h1>
              <p className="text-xs text-[#14b8a6] tracking-wider uppercase">Secure. Reliable. Tropical.</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-900/40 border border-red-700/60 rounded text-xs text-red-200">
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Username</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-[#0b1220] border border-[#1e293b] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#14b8a6]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-[#0b1220] border border-[#1e293b] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#14b8a6]"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full mt-4 bg-[#14b8a6] hover:bg-[#0d9488] text-[#0b1220] font-bold py-2 rounded text-sm transition"
            >
              Sign In to TCC
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-slate-500">
            Enterprise Dedicated Infrastructure Operations
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#0b1220] text-slate-200 font-sans">
      <aside className="w-64 bg-[#0f172a] border-r border-[#1e293b] flex flex-col justify-between select-none">
        <div>
          <div className="p-4 border-b border-[#1e293b] flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-[#14b8a6]/20 border border-[#14b8a6] flex items-center justify-center">
              <Layers className="text-[#14b8a6] h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide text-white block">TCC</span>
              <span className="text-[10px] text-[#14b8a6] uppercase tracking-wider block">Tropical Control</span>
            </div>
          </div>

          <nav className="p-2 space-y-1 text-xs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition ${
                activeTab === 'dashboard' ? 'bg-[#14b8a6]/20 text-[#14b8a6] font-semibold' : 'hover:bg-[#1e293b] text-slate-400'
              }`}
            >
              <Activity className="h-4 w-4" /> Executive Dashboard
            </button>
            <button
              onClick={() => setActiveTab('servers')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition ${
                activeTab === 'servers' ? 'bg-[#14b8a6]/20 text-[#14b8a6] font-semibold' : 'hover:bg-[#1e293b] text-slate-400'
              }`}
            >
              <Server className="h-4 w-4" /> Infrastructure Inventory
            </button>
            <button
              onClick={() => setActiveTab('provisioning')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition ${
                activeTab === 'provisioning' ? 'bg-[#14b8a6]/20 text-[#14b8a6] font-semibold' : 'hover:bg-[#1e293b] text-slate-400'
              }`}
            >
              <Sliders className="h-4 w-4" /> Provisioning Engine
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition ${
                activeTab === 'agents' ? 'bg-[#14b8a6]/20 text-[#14b8a6] font-semibold' : 'hover:bg-[#1e293b] text-slate-400'
              }`}
            >
              <Cpu className="h-4 w-4" /> Tropical Agents
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition ${
                activeTab === 'customers' ? 'bg-[#14b8a6]/20 text-[#14b8a6] font-semibold' : 'hover:bg-[#1e293b] text-slate-400'
              }`}
            >
              <Users className="h-4 w-4" /> Customer Management
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition ${
                activeTab === 'contracts' ? 'bg-[#14b8a6]/20 text-[#14b8a6] font-semibold' : 'hover:bg-[#1e293b] text-slate-400'
              }`}
            >
              <FileText className="h-4 w-4" /> Contracts & Enforcement
            </button>
            <button
              onClick={() => setActiveTab('remote')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition ${
                activeTab === 'remote' ? 'bg-[#14b8a6]/20 text-[#14b8a6] font-semibold' : 'hover:bg-[#1e293b] text-slate-400'
              }`}
            >
              <Terminal className="h-4 w-4" /> Remote Operations
            </button>
            <button
              onClick={() => setActiveTab('incidents')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition ${
                activeTab === 'incidents' ? 'bg-[#14b8a6]/20 text-[#14b8a6] font-semibold' : 'hover:bg-[#1e293b] text-slate-400'
              }`}
            >
              <ShieldAlert className="h-4 w-4" /> Incidents & Alerts
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition ${
                activeTab === 'audit' ? 'bg-[#14b8a6]/20 text-[#14b8a6] font-semibold' : 'hover:bg-[#1e293b] text-slate-400'
              }`}
            >
              <FileText className="h-4 w-4" /> Immutable Audit Log
            </button>
          </nav>
        </div>

        <div className="p-3 border-t border-[#1e293b]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-slate-400 truncate">Administrator</span>
            <button
              onClick={refreshData}
              title="Refresh Telemetry"
              className="text-slate-400 hover:text-[#14b8a6] p-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-2 py-1.5 bg-[#1e293b] hover:bg-red-900/30 text-slate-300 hover:text-red-300 rounded text-xs transition"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-[#0b1220]">
        <header className="h-14 border-b border-[#1e293b] bg-[#111827]/60 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-white capitalize">{activeTab}</h2>
            <span className="text-xs text-slate-500 font-mono">|</span>
            <span className="text-xs text-slate-400">Tropical Servers Central Control</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e] animate-pulse"></span>
              <span className="text-xs text-slate-300 font-medium">TCC Operational</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'dashboard' && metrics && (
            <div className="space-y-6">
              {/* Primary KPI Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#111827] border border-[#1e293b] rounded p-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Managed Servers</div>
                  <div className="text-2xl font-bold text-white mt-1">{metrics.totalManagedServers}</div>
                  <div className="text-xs text-slate-500 mt-1 flex gap-2">
                    <span className="text-[#22c55e]">{metrics.onlineServers} Online</span>
                    <span>•</span>
                    <span className="text-red-400">{metrics.offlineServers} Offline</span>
                    <span>•</span>
                    <span className="text-slate-400">{metrics.unknownServers} Unknown</span>
                  </div>
                </div>

                <div className="bg-[#111827] border border-[#1e293b] rounded p-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Registered Agents</div>
                  <div className="text-2xl font-bold text-[#14b8a6] mt-1">{metrics.totalRegisteredAgents}</div>
                  <div className="text-xs text-slate-500 mt-1 flex gap-2">
                    <span className="text-[#22c55e]">{metrics.onlineAgents} Online</span>
                    <span>•</span>
                    <span className="text-red-400">{metrics.offlineAgents} Offline</span>
                  </div>
                </div>

                <div className="bg-[#111827] border border-[#1e293b] rounded p-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Active Deployments</div>
                  <div className="text-2xl font-bold text-white mt-1">{metrics.activeDeployments}</div>
                  <div className="text-xs text-slate-500 mt-1">{metrics.activeCustomers} Enterprise Customers</div>
                </div>

                <div className="bg-[#111827] border border-[#1e293b] rounded p-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Open Incidents</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">{metrics.openIncidentsCount}</div>
                  <div className="text-xs text-slate-500 mt-1">{metrics.recentActivityCount} audit actions in 24h</div>
                </div>
              </div>

              {/* Genuine Infrastructure Utilization Panel */}
              <div className="bg-[#111827] border border-[#1e293b] rounded p-5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Zap className="h-4 w-4 text-[#14b8a6]" />
                      Genuine Infrastructure Utilization
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Aggregated live from {metrics.utilization?.reportingAgentsCount || 0} authenticated customer agents
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-[#0b1220] border border-[#1e293b] rounded p-4">
                    <div className="text-xs text-slate-400">Average CPU Utilization</div>
                    <div className="text-xl font-bold text-white mt-1">
                      {metrics.utilization?.averageCpuPercent !== null && metrics.utilization?.averageCpuPercent !== undefined
                        ? `${metrics.utilization.averageCpuPercent}%`
                        : 'Awaiting Telemetry'}
                    </div>
                  </div>

                  <div className="bg-[#0b1220] border border-[#1e293b] rounded p-4">
                    <div className="text-xs text-slate-400">Average Memory Consumption</div>
                    <div className="text-xl font-bold text-white mt-1">
                      {metrics.utilization?.averageMemoryPercent !== null && metrics.utilization?.averageMemoryPercent !== undefined
                        ? `${metrics.utilization.averageMemoryPercent}%`
                        : 'Awaiting Telemetry'}
                    </div>
                  </div>

                  <div className="bg-[#0b1220] border border-[#1e293b] rounded p-4">
                    <div className="text-xs text-slate-400">Storage Allocated & Used</div>
                    <div className="text-xl font-bold text-white mt-1">
                      {metrics.utilization?.averageStoragePercent !== null && metrics.utilization?.averageStoragePercent !== undefined
                        ? `${metrics.utilization.averageStoragePercent}%`
                        : 'Awaiting Telemetry'}
                    </div>
                  </div>

                  <div className="bg-[#0b1220] border border-[#1e293b] rounded p-4">
                    <div className="text-xs text-slate-400">Combined Network Bandwidth</div>
                    <div className="text-xl font-bold text-[#14b8a6] mt-1">
                      {Math.round(((metrics.utilization?.totalBandwidthRxBytesSec || 0) + (metrics.utilization?.totalBandwidthTxBytesSec || 0)) / 1024)} KB/s
                    </div>
                  </div>
                </div>
              </div>

              {/* Infrastructure Summary Table */}
              <div className="bg-[#111827] border border-[#1e293b] rounded">
                <div className="p-4 border-b border-[#1e293b] flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white">Live Infrastructure Status</h3>
                  <button
                    onClick={() => setActiveTab('servers')}
                    className="text-xs text-[#14b8a6] hover:underline"
                  >
                    View All Servers &rarr;
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0f172a] text-slate-400 border-b border-[#1e293b]">
                      <tr>
                        <th className="p-3">Hostname</th>
                        <th className="p-3">Provider</th>
                        <th className="p-3">IP Address</th>
                        <th className="p-3">Specs</th>
                        <th className="p-3">Monitoring</th>
                        <th className="p-3">Deployment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b]">
                      {servers.slice(0, 5).map((srv) => (
                        <tr key={srv.id} className="hover:bg-[#1e293b]/50">
                          <td className="p-3 font-mono font-medium text-white">{srv.hostname}</td>
                          <td className="p-3 capitalize">{srv.provider.replace('_', ' ')}</td>
                          <td className="p-3 font-mono text-slate-300">{srv.ipAddress}</td>
                          <td className="p-3">{srv.specs.cpuCores}c / {srv.specs.ramGb}GB / {srv.specs.storageGb}GB {srv.specs.storageType}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                              srv.monitoringStatus === 'online' ? 'bg-green-900/40 text-[#22c55e] border border-green-700/60' :
                              srv.monitoringStatus === 'offline' ? 'bg-red-900/40 text-red-400 border border-red-700/60' :
                              'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {srv.monitoringStatus.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 capitalize text-slate-400">{srv.deploymentStatus}</td>
                        </tr>
                      ))}
                      {servers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-500">
                            No dedicated servers currently registered in inventory.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'servers' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">Managed Dedicated Servers ({servers.length})</h3>
                <button
                  onClick={() => setShowProvModal(true)}
                  className="bg-[#14b8a6] hover:bg-[#0d9488] text-[#0b1220] px-3 py-1.5 rounded text-xs font-bold transition"
                >
                  + Provision New Server
                </button>
              </div>

              <div className="bg-[#111827] border border-[#1e293b] rounded overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0f172a] text-slate-400 border-b border-[#1e293b]">
                    <tr>
                      <th className="p-3">Server ID</th>
                      <th className="p-3">Hostname</th>
                      <th className="p-3">Provider</th>
                      <th className="p-3">IP Address</th>
                      <th className="p-3">OS</th>
                      <th className="p-3">Hardware Specs</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Cost/Mo</th>
                      <th className="p-3">Monitoring</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {servers.map((s) => (
                      <tr key={s.id} className="hover:bg-[#1e293b]/50">
                        <td className="p-3 font-mono text-slate-500">{s.id}</td>
                        <td className="p-3 font-mono font-bold text-white">{s.hostname}</td>
                        <td className="p-3 capitalize">{s.provider.replace('_', ' ')}</td>
                        <td className="p-3 font-mono text-slate-300">{s.ipAddress}</td>
                        <td className="p-3 text-slate-300">{s.operatingSystem}</td>
                        <td className="p-3 text-slate-400">
                          {s.specs.cpuCores}c / {s.specs.ramGb}GB RAM / {s.specs.storageGb}GB {s.specs.storageType}
                        </td>
                        <td className="p-3 uppercase text-slate-400">{s.location}</td>
                        <td className="p-3 text-slate-300">${s.rentalCostMonthly}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            s.monitoringStatus === 'online' ? 'bg-green-900/40 text-[#22c55e] border border-green-700/60' :
                            s.monitoringStatus === 'offline' ? 'bg-red-900/40 text-red-400 border border-red-700/60' :
                            'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {s.monitoringStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 capitalize text-slate-400">{s.deploymentStatus}</td>
                      </tr>
                    ))}
                    {servers.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-6 text-center text-slate-500">
                          No servers found. Provision new servers using the Provisioning Engine.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'provisioning' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">Provisioning Jobs Queue</h3>
                <button
                  onClick={() => setShowProvModal(true)}
                  className="bg-[#14b8a6] hover:bg-[#0d9488] text-[#0b1220] px-3 py-1.5 rounded text-xs font-bold transition"
                >
                  + New Provisioning Request
                </button>
              </div>

              <div className="bg-[#111827] border border-[#1e293b] rounded overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0f172a] text-slate-400 border-b border-[#1e293b]">
                    <tr>
                      <th className="p-3">Job ID</th>
                      <th className="p-3">Target Hostname</th>
                      <th className="p-3">Provider</th>
                      <th className="p-3">Plan</th>
                      <th className="p-3">Stage</th>
                      <th className="p-3">Progress</th>
                      <th className="p-3">Logs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {jobs.map((j) => (
                      <tr key={j.id} className="hover:bg-[#1e293b]/50">
                        <td className="p-3 font-mono text-slate-500">{j.id}</td>
                        <td className="p-3 font-mono font-bold text-white">{j.targetHostname}</td>
                        <td className="p-3 capitalize">{j.provider}</td>
                        <td className="p-3 font-mono text-slate-400">{j.planId}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            j.state === 'COMPLETED' ? 'bg-green-900/40 text-[#22c55e]' :
                            j.state === 'FAILED' ? 'bg-red-900/40 text-red-400' :
                            'bg-blue-900/40 text-blue-300 animate-pulse'
                          }`}>
                            {j.state}
                          </span>
                        </td>
                        <td className="p-3 w-32">
                          <div className="w-full bg-[#1e293b] rounded-full h-2">
                            <div
                              className="bg-[#14b8a6] h-2 rounded-full"
                              style={{ width: `${j.progressPercent}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] text-slate-400">{j.progressPercent}%</span>
                        </td>
                        <td className="p-3 text-[11px] text-slate-400 font-mono max-w-xs truncate">
                          {j.logs?.length > 0 ? j.logs[j.logs.length - 1].message : 'Pending'}
                        </td>
                      </tr>
                    ))}
                    {jobs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-500">
                          No provisioning jobs active or recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Tropical Monitoring Agents ({agents.length})</h3>
              <div className="grid grid-cols-2 gap-4">
                {agents.map((agt) => (
                  <div key={agt.id} className="bg-[#111827] border border-[#1e293b] rounded p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono font-bold text-sm text-white">{agt.hostname}</div>
                        <div className="text-[11px] text-slate-500 font-mono">ID: {agt.id} | v{agt.version}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          agt.status === 'ONLINE' ? 'bg-green-900/40 text-[#22c55e] border border-green-700/60' :
                          agt.status === 'OFFLINE' ? 'bg-red-900/40 text-red-400 border border-red-700/60' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {agt.status}
                        </span>
                        {!agt.isRevoked && (
                          <button
                            onClick={() => handleRevokeAgent(agt.id)}
                            className="text-[10px] bg-red-900/30 hover:bg-red-900/60 text-red-300 px-2 py-0.5 rounded border border-red-700/50"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>

                    {agt.latestTelemetry ? (
                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#1e293b] text-center text-xs">
                        <div className="bg-[#0b1220] p-2 rounded">
                          <div className="text-[10px] text-slate-400">CPU</div>
                          <div className="font-bold text-white mt-1">{agt.latestTelemetry.cpuUsagePercent}%</div>
                        </div>
                        <div className="bg-[#0b1220] p-2 rounded">
                          <div className="text-[10px] text-slate-400">Memory</div>
                          <div className="font-bold text-white mt-1">{agt.latestTelemetry.memoryUsedMb}MB</div>
                        </div>
                        <div className="bg-[#0b1220] p-2 rounded">
                          <div className="text-[10px] text-slate-400">Disk</div>
                          <div className="font-bold text-white mt-1">{agt.latestTelemetry.storageUsedGb}GB</div>
                        </div>
                        <div className="bg-[#0b1220] p-2 rounded">
                          <div className="text-[10px] text-slate-400">Uptime</div>
                          <div className="font-bold text-white mt-1">{Math.floor(agt.latestTelemetry.uptimeSeconds / 3600)}h</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic py-2">
                        Waiting for initial authenticated heartbeat telemetry...
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400">
                      Last Heartbeat: {agt.lastHeartbeatAt ? new Date(agt.lastHeartbeatAt).toLocaleString() : 'Never'}
                    </div>
                  </div>
                ))}
                {agents.length === 0 && (
                  <div className="col-span-2 p-8 bg-[#111827] border border-[#1e293b] rounded text-center text-slate-500 text-xs">
                    No agents registered. Deploy servers to automatically enroll agents.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Enterprise Customers ({customers.length})</h3>
              <div className="bg-[#111827] border border-[#1e293b] rounded overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0f172a] text-slate-400 border-b border-[#1e293b]">
                    <tr>
                      <th className="p-3">Customer ID</th>
                      <th className="p-3">Company Name</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Service Tier</th>
                      <th className="p-3">Assigned Servers</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-[#1e293b]/50">
                        <td className="p-3 font-mono text-slate-500">{c.id}</td>
                        <td className="p-3 font-bold text-white">{c.companyName}</td>
                        <td className="p-3 text-slate-300">
                          {c.contact.primaryName} ({c.contact.email})
                        </td>
                        <td className="p-3 text-[#14b8a6]">{c.serviceTier}</td>
                        <td className="p-3 font-mono text-slate-400">{c.assignedServerIds?.length || 0} servers</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            c.status === 'active' ? 'bg-green-900/40 text-[#22c55e]' :
                            c.status === 'suspended' ? 'bg-red-900/40 text-red-300' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {customers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">
                          No customer records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">Customer Contracts & Service Enforcement</h3>
              </div>

              <div className="bg-[#111827] border border-[#1e293b] rounded overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0f172a] text-slate-400 border-b border-[#1e293b]">
                    <tr>
                      <th className="p-3">Contract ID</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Monthly Value</th>
                      <th className="p-3">Renewal Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {contracts.map((cnt) => (
                      <tr key={cnt.id} className="hover:bg-[#1e293b]/50">
                        <td className="p-3 font-mono text-slate-500">{cnt.id}</td>
                        <td className="p-3 font-mono text-slate-300">{cnt.customerId}</td>
                        <td className="p-3 font-bold text-white">{cnt.title}</td>
                        <td className="p-3 font-semibold text-[#14b8a6]">${cnt.monthlyValueUsd}/mo</td>
                        <td className="p-3 text-slate-400">{cnt.renewalDate}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            cnt.status === 'ACTIVE' ? 'bg-green-900/40 text-[#22c55e]' :
                            cnt.status === 'SUSPENDED' ? 'bg-red-900/40 text-red-300' :
                            'bg-amber-900/40 text-amber-300'
                          }`}>
                            {cnt.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              setEnforceContractId(cnt.id);
                              setShowEnforceModal(true);
                            }}
                            className="bg-[#1e293b] hover:bg-[#14b8a6] hover:text-[#0b1220] px-2.5 py-1 rounded text-[10px] font-bold transition"
                          >
                            Enforcement Workflow
                          </button>
                        </td>
                      </tr>
                    ))}
                    {contracts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-500">
                          No customer contracts currently on file.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'remote' && (
            <div className="space-y-4 max-w-3xl">
              <h3 className="text-sm font-bold text-white">Controlled Remote Infrastructure Operations</h3>
              <div className="bg-[#111827] border border-[#1e293b] rounded p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Target Agent</label>
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    className="w-full bg-[#0b1220] border border-[#1e293b] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#14b8a6]"
                  >
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.hostname} ({a.id}) - {a.status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Operation Command</label>
                  <select
                    value={remoteCommand}
                    onChange={(e) => setRemoteCommand(e.target.value)}
                    className="w-full bg-[#0b1220] border border-[#1e293b] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#14b8a6]"
                  >
                    <option value="GET_DIAGNOSTICS">Request Hardware & OS Diagnostics</option>
                    <option value="GET_SERVICE_STATUS">Inspect System Services</option>
                    <option value="RESTART_SERVICE">Graceful Service Restart (Disruptive)</option>
                    <option value="SCHEDULE_MAINTENANCE">Schedule Maintenance Window</option>
                    <option value="UPGRADE_AGENT">Trigger Agent Upgrade</option>
                  </select>
                </div>

                <button
                  onClick={handleExecuteRemote}
                  disabled={!selectedAgentId}
                  className="bg-[#14b8a6] hover:bg-[#0d9488] text-[#0b1220] font-bold px-4 py-2 rounded text-xs transition"
                >
                  Execute Authorized Command
                </button>

                {remoteOutput && (
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Execution Output</label>
                    <pre className="p-3 bg-[#0b1220] border border-[#1e293b] rounded text-xs text-[#22c55e] font-mono whitespace-pre-wrap">
                      {remoteOutput}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'incidents' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">Operational Incidents & Severity Tracking</h3>
                <button
                  onClick={() => setShowIncidentModal(true)}
                  className="bg-[#14b8a6] hover:bg-[#0d9488] text-[#0b1220] px-3 py-1.5 rounded text-xs font-bold transition"
                >
                  + Report Incident
                </button>
              </div>

              <div className="bg-[#111827] border border-[#1e293b] rounded overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0f172a] text-slate-400 border-b border-[#1e293b]">
                    <tr>
                      <th className="p-3">Incident ID</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Severity</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Reported At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {incidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-[#1e293b]/50">
                        <td className="p-3 font-mono text-slate-500">{inc.id}</td>
                        <td className="p-3 font-bold text-white">{inc.title}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inc.severity === 'CRITICAL' ? 'bg-red-900/60 text-red-200' :
                            inc.severity === 'HIGH' ? 'bg-amber-900/50 text-amber-200' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {inc.severity}
                          </span>
                        </td>
                        <td className="p-3 uppercase font-semibold text-slate-300">{inc.status}</td>
                        <td className="p-3 text-slate-500">{new Date(inc.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                    {incidents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500">
                          Zero active incidents. Operational status optimal.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Immutable Administrative Audit Log</h3>
              <div className="bg-[#111827] border border-[#1e293b] rounded overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0f172a] text-slate-400 border-b border-[#1e293b]">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Actor</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Target</th>
                      <th className="p-3">IP Address</th>
                      <th className="p-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#1e293b]/50">
                        <td className="p-3 text-slate-400">{log.timestamp}</td>
                        <td className="p-3 font-semibold text-white">{log.actor_username}</td>
                        <td className="p-3 text-[#14b8a6]">{log.action}</td>
                        <td className="p-3 text-slate-300">{log.target_type}:{log.target_id}</td>
                        <td className="p-3 text-slate-500">{log.ip_address}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.result === 'SUCCESS' ? 'text-[#22c55e]' : 'text-red-400'
                          }`}>
                            {log.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">
                          Audit history empty.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Provisioning Modal */}
      {showProvModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Request Dedicated Server Provisioning</h3>
            <form onSubmit={handleQueueProvisioning} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Target Hostname</label>
                <input
                  type="text"
                  value={provForm.targetHostname}
                  onChange={(e) => setProvForm({ ...provForm, targetHostname: e.target.value })}
                  className="w-full bg-[#0b1220] border border-[#1e293b] rounded px-3 py-2 text-sm text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Infrastructure Provider</label>
                <select
                  value={provForm.provider}
                  onChange={(e) => setProvForm({ ...provForm, provider: e.target.value })}
                  className="w-full bg-[#0b1220] border border-[#1e293b] rounded px-3 py-2 text-sm text-white"
                >
                  <option value="equinix_metal">Equinix Metal Bare Metal</option>
                  <option value="hetzner">Hetzner Dedicated Root</option>
                  <option value="aws">Amazon Web Services (EC2 Dedicated)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Hardware Plan</label>
                <select
                  value={provForm.planId}
                  onChange={(e) => setProvForm({ ...provForm, planId: e.target.value })}
                  className="w-full bg-[#0b1220] border border-[#1e293b] rounded px-3 py-2 text-sm text-white"
                >
                  <option value="c3.medium.x86">c3.medium.x86 (24 cores / 64GB RAM / 960GB NVMe)</option>
                  <option value="m3.large.x86">m3.large.x86 (32 cores / 256GB RAM / 3.8TB NVMe)</option>
                  <option value="ax102">ax102 Ryzen 9 7950X3D (16 cores / 128GB RAM)</option>
                  <option value="c5.metal">AWS c5.metal (96 cores / 192GB RAM)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Operating System</label>
                <input
                  type="text"
                  value={provForm.targetOs}
                  onChange={(e) => setProvForm({ ...provForm, targetOs: e.target.value })}
                  className="w-full bg-[#0b1220] border border-[#1e293b] rounded px-3 py-2 text-sm text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Assign to Customer ID</label>
                <input
                  type="text"
                  value={provForm.customerId}
                  onChange={(e) => setProvForm({ ...provForm, customerId: e.target.value })}
                  placeholder="e.g. cust-01 or leave blank for unassigned pool"
                  className="w-full bg-[#0b1220] border border-[#1e293b] rounded px-3 py-2 text-sm text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setShowProvModal(false)}
                  className="px-4 py-2 bg-[#1e293b] hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#14b8a6] hover:bg-[#0d9488] text-[#0b1220] font-bold rounded text-xs transition"
                >
                  Submit Provisioning Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Enforcement Modal */}
      {showEnforceModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-amber-400" />
              Service Enforcement Decision
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Contract ID: <span className="font-mono text-white">{enforceContractId}</span>. Actions require recorded administrative reasons and adherence to customer grace periods. No automatic data destruction will occur.
            </p>

            <form onSubmit={handleExecuteEnforcement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Enforcement Action Type</label>
                <select
                  value={enforceActionType}
                  onChange={(e) => setEnforceActionType(e.target.value)}
                  className="w-full bg-[#0b1220] border border-[#1e293b] rounded px-3 py-2 text-sm text-white"
                >
                  <option value="GRACE_PERIOD_NOTICE">Grace Period Notice (Pre-suspension)</option>
                  <option value="DEFAULT_WARNING">Default Warning Notice</option>
                  <option value="SUSPENSION">Execute Graceful Suspension (Recoverable)</option>
                  <option value="REINSTATEMENT">Reinstate Active Service</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notice & Grace Period (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={enforceGraceDays}
                  onChange={(e) => setEnforceGraceDays(Number(e.target.value))}
                  className="w-full bg-[#0b1220] border border-[#1e293b] rounded px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Recorded Administrative Reason</label>
                <textarea
                  value={enforceReason}
                  onChange={(e) => setEnforceReason(e.target.value)}
                  placeholder="Record formal justification for the compliance audit trail..."
                  className="w-full bg-[#0b1220] border border-[#1e293b] rounded px-3 py-2 text-sm text-white h-24"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setShowEnforceModal(false)}
                  className="px-4 py-2 bg-[#1e293b] hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-[#0b1220] font-bold rounded text-xs transition"
                >
                  Authorize Enforcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Incident Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Report Operational Incident</h3>
            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Incident Title</label>
                <input
                  type="text"
                  value={incForm.title}
                  onChange={(e) => setIncForm({ ...incForm, title: e.target.value })}
                  className="w-full bg-[#0b1220] border border-[#1e293b] rounded px-3 py-2 text-sm text-white"
                  placeholder="e.g. Upstream Provider Fiber Degraded"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Severity</label>
                <select
                  value={incForm.severity}
                  onChange={(e) => setIncForm({ ...incForm, severity: e.target.value })}
                  className="w-full bg-[#0b1220] border border-[#1e293b] rounded px-3 py-2 text-sm text-white"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description & Scope</label>
                <textarea
                  value={incForm.description}
                  onChange={(e) => setIncForm({ ...incForm, description: e.target.value })}
                  className="w-full bg-[#0b1220] border border-[#1e293b] rounded px-3 py-2 text-sm text-white h-24"
                  placeholder="Detail symptoms, scope of affected infrastructure, and immediate remediation steps..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="px-4 py-2 bg-[#1e293b] hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#14b8a6] hover:bg-[#0d9488] text-[#0b1220] font-bold rounded text-xs transition"
                >
                  Submit Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
