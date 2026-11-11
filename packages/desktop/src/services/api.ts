const API_BASE = 'http://localhost:4000/api/v1';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('tcc_auth_token', token);
    else localStorage.removeItem('tcc_auth_token');
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('tcc_auth_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as any),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
  }

  login(username: string, passwordPlain: string) {
    return this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password: passwordPlain }),
    });
  }

  getDashboardMetrics() {
    return this.request<any>('/dashboard/metrics');
  }

  getServers() {
    return this.request<any[]>('/infrastructure/servers');
  }

  createServer(server: any) {
    return this.request<any>('/infrastructure/servers', {
      method: 'POST',
      body: JSON.stringify(server),
    });
  }

  getProvisioningJobs() {
    return this.request<any[]>('/provisioning/jobs');
  }

  queueProvisioningJob(job: any) {
    return this.request<any>('/provisioning/jobs', {
      method: 'POST',
      body: JSON.stringify(job),
    });
  }

  getAgents() {
    return this.request<any[]>('/agent/agents');
  }

  getCustomers() {
    return this.request<any[]>('/management/customers');
  }

  getContracts() {
    return this.request<any[]>('/management/contracts');
  }

  getIncidents() {
    return this.request<any[]>('/admin/incidents');
  }

  getAuditLogs() {
    return this.request<any[]>('/admin/audit-logs');
  }

  executeRemoteOp(op: any) {
    return this.request<any>('/remote/operations', {
      method: 'POST',
      body: JSON.stringify(op),
    });
  }
}

export const api = new ApiClient();
