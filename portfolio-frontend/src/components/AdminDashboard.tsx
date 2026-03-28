'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminVisitsTable from '@/components/AdminVisitsTable';
import AdminVisitCharts from '@/components/AdminVisitCharts';
import AdminVisitGlobe from '@/components/AdminVisitGlobe';
import {
	type Visit,
	getAdminApiUrl,
	getAdminAuthHeader,
} from '@/lib/adminVisit';

export default function AdminDashboard() {
	const [password, setPassword] = React.useState('');
	const [authPassword, setAuthPassword] = React.useState<string | null>(null);
	const [visits, setVisits] = React.useState<Visit[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const apiUrl = getAdminApiUrl();

	const fetchVisits = React.useCallback(async () => {
		if (!authPassword) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`${apiUrl}/api/admin/visits`, {
				headers: { Authorization: getAdminAuthHeader(authPassword) },
			});
			if (!res.ok) {
				if (res.status === 401) {
					setAuthPassword(null);
					setError('Invalid password');
				} else {
					setError('Failed to fetch visits');
				}
				return;
			}
			const data = (await res.json()) as { visits: Visit[] };
			setVisits(data.visits);
		} catch {
			setError('Failed to fetch visits');
		} finally {
			setLoading(false);
		}
	}, [apiUrl, authPassword]);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!password.trim()) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`${apiUrl}/api/admin/visits`, {
				headers: { Authorization: getAdminAuthHeader(password) },
			});
			if (!res.ok) {
				if (res.status === 401) {
					setError('Invalid password');
				} else {
					setError('Failed to connect');
				}
				return;
			}
			setAuthPassword(password);
			const data = (await res.json()) as { visits: Visit[] };
			setVisits(data.visits);
		} catch {
			setError('Failed to connect');
		} finally {
			setLoading(false);
		}
	};

	if (!authPassword) {
		return (
			<div className="space-y-4 max-w-md">
				<h2 className="text-lg font-medium">Admin Login</h2>
				<form onSubmit={handleLogin} className="space-y-3">
					<Input
						type="password"
						placeholder="Password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						disabled={loading}
						autoComplete="current-password"
					/>
					<Button type="submit" disabled={loading}>
						{loading ? '…' : 'Login'}
					</Button>
				</form>
				{error && <p className="text-destructive text-sm">{error}</p>}
			</div>
		);
	}

	const withGeo = visits.filter((v) => v.lat != null && v.lon != null).length;

	return (
		<div className="space-y-8">
			<section className="flex flex-wrap items-baseline gap-6 text-sm border-b border-border pb-4">
				<p>
					<span className="text-muted-foreground">Total visits</span>{' '}
					<span className="font-medium tabular-nums">{visits.length}</span>
				</p>
				<p>
					<span className="text-muted-foreground">With coordinates</span>{' '}
					<span className="font-medium tabular-nums">{withGeo}</span>
				</p>
			</section>

			<AdminVisitCharts visits={visits} />

			<AdminVisitGlobe visits={visits} />

			<AdminVisitsTable
				visits={visits}
				setVisits={setVisits}
				authPassword={authPassword}
				apiUrl={apiUrl}
				loading={loading}
				fetchError={error}
				onFetchVisits={fetchVisits}
			/>
		</div>
	);
}
