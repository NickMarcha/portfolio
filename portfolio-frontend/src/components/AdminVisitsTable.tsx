'use client';

import * as React from 'react';
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	useReactTable,
} from '@tanstack/react-table';
import type {
	ColumnDef,
	ColumnFiltersState,
	OnChangeFn,
	PaginationState,
} from '@tanstack/react-table';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { type Visit, getAdminAuthHeader } from '@/lib/adminVisit';

function visitNeedsEnrich(v: Visit): boolean {
	return (
		Boolean(v.ip) && ((!v.city && !v.isp) || v.lat == null || v.lon == null)
	);
}

function mergeVisitsInto(prev: Visit[], incoming: Visit[]): Visit[] {
	const m = new Map(prev.map((v) => [v.id, v]));
	for (const v of incoming) m.set(v.id, v);
	return [...m.values()].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

interface AdminVisitsTableProps {
	visits: Visit[];
	setVisits: React.Dispatch<React.SetStateAction<Visit[]>>;
	authPassword: string;
	apiUrl: string;
	loading: boolean;
	fetchError: string | null;
	onFetchVisits: () => void;
}

const defaultPagination: PaginationState = { pageIndex: 0, pageSize: 10 };

export default function AdminVisitsTable({
	visits,
	setVisits,
	authPassword,
	apiUrl,
	loading,
	fetchError,
	onFetchVisits,
}: AdminVisitsTableProps) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [pagination, setPagination] = React.useState<PaginationState>(defaultPagination);
	const [onlyNeedsEnrich, setOnlyNeedsEnrich] = React.useState(false);
	const [enrichingId, setEnrichingId] = React.useState<number | null>(null);
	const [rateLimitedUntil, setRateLimitedUntil] = React.useState<number>(0);
	const [batchRunning, setBatchRunning] = React.useState(false);
	const [batchLimit, setBatchLimit] = React.useState(25);
	const [batchNote, setBatchNote] = React.useState<string | null>(null);

	const onColumnFiltersChange = React.useCallback<OnChangeFn<ColumnFiltersState>>(
		(updater) => {
			setColumnFilters(updater);
			setPagination((p) => ({ ...p, pageIndex: 0 }));
		},
		[]
	);

	const tableData = React.useMemo(
		() => (onlyNeedsEnrich ? visits.filter(visitNeedsEnrich) : visits),
		[visits, onlyNeedsEnrich]
	);

	const handleEnrich = async (id: number) => {
		if (!authPassword) return;
		if (Date.now() < rateLimitedUntil) return;
		setEnrichingId(id);
		try {
			const res = await fetch(`${apiUrl}/api/admin/visits/${id}/enrich`, {
				method: 'POST',
				headers: { Authorization: getAdminAuthHeader(authPassword) },
			});
			const data = await res.json();
			if (res.status === 429) {
				const retryAfter = (data as { retryAfter?: number }).retryAfter ?? 60;
				setRateLimitedUntil(Date.now() + retryAfter * 1000);
			} else if (res.ok) {
				const updated = (data as { visit: Visit }).visit;
				setVisits((prev) => prev.map((v) => (v.id === id ? updated : v)));
			}
		} catch {
			// ignore
		} finally {
			setEnrichingId(null);
		}
	};

	const handleEnrichBatch = async () => {
		if (!authPassword || batchRunning) return;
		if (Date.now() < rateLimitedUntil) return;
		setBatchRunning(true);
		setBatchNote(null);
		try {
			const res = await fetch(`${apiUrl}/api/admin/visits/enrich-batch`, {
				method: 'POST',
				headers: {
					Authorization: getAdminAuthHeader(authPassword),
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ limit: batchLimit }),
			});
			const data = (await res.json()) as {
				visits?: Visit[];
				processed?: number;
				failed?: number;
				attempted?: number;
				retryAfter?: number;
				error?: string;
			};
			if (res.status === 429) {
				const retryAfter = data.retryAfter ?? 60;
				setRateLimitedUntil(Date.now() + retryAfter * 1000);
				const partial = Array.isArray(data.visits) ? data.visits : [];
				if (partial.length) {
					setVisits((prev) => mergeVisitsInto(prev, partial));
				}
				setBatchNote(
					`Rate limited after ${partial.length} update(s). Retry in ${retryAfter}s.`
				);
				return;
			}
			if (!res.ok) {
				setBatchNote(data.error ?? 'Batch enrich failed');
				return;
			}
			const list = data.visits ?? [];
			if (list.length) {
				setVisits((prev) => mergeVisitsInto(prev, list));
			}
			setBatchNote(
				`Updated ${data.processed ?? list.length}, failed ${data.failed ?? 0} (attempted ${data.attempted ?? batchLimit}).`
			);
		} catch {
			setBatchNote('Batch enrich failed');
		} finally {
			setBatchRunning(false);
		}
	};

	const columns: ColumnDef<Visit>[] = [
		{ accessorKey: 'path', header: 'Path' },
		{ accessorKey: 'timestamp', header: 'Timestamp' },
		{ accessorKey: 'ip', header: 'IP' },
		{ accessorKey: 'country', header: 'Country' },
		{ accessorKey: 'city', header: 'City' },
		{ accessorKey: 'regionName', header: 'Region' },
		{ accessorKey: 'lat', header: 'Lat' },
		{ accessorKey: 'lon', header: 'Lon' },
		{ accessorKey: 'timezone', header: 'Timezone' },
		{ accessorKey: 'isp', header: 'ISP' },
		{ accessorKey: 'org', header: 'Org' },
		{
			id: 'actions',
			header: '',
			cell: ({ row }) => {
				const v = row.original;
				const needsEnrich = visitNeedsEnrich(v);
				const isRateLimited = Date.now() < rateLimitedUntil;
				return (
					<Button
						variant="outline"
						size="xs"
						disabled={!needsEnrich || !!enrichingId || batchRunning || isRateLimited}
						onClick={() => handleEnrich(v.id)}
					>
						{enrichingId === v.id ? '…' : 'Enrich'}
					</Button>
				);
			},
		},
	];

	const table = useReactTable({
		data: tableData,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onColumnFiltersChange,
		onPaginationChange: setPagination,
		getFilteredRowModel: getFilteredRowModel(),
		autoResetPageIndex: false,
		state: { columnFilters, pagination },
	});

	const rateLimitedSeconds = Math.ceil((rateLimitedUntil - Date.now()) / 1000);

	return (
		<div className="space-y-4">
			<h2 className="text-base font-medium">Raw visits</h2>
			{fetchError && <p className="text-destructive text-sm">{fetchError}</p>}
			<div className="flex items-center gap-4 flex-wrap">
				<label className="flex items-center gap-2 text-sm cursor-pointer">
					<input
						type="checkbox"
						checked={onlyNeedsEnrich}
						onChange={(e) => {
							setOnlyNeedsEnrich(e.target.checked);
							setPagination((p) => ({ ...p, pageIndex: 0 }));
						}}
						className="rounded border-border"
					/>
					Only rows needing enrich
				</label>
				<Input
					placeholder="Filter path..."
					value={(table.getColumn('path')?.getFilterValue() as string) ?? ''}
					onChange={(e) =>
						table.getColumn('path')?.setFilterValue(e.target.value)
					}
					className="max-w-[200px]"
				/>
				<Input
					placeholder="Filter country..."
					value={(table.getColumn('country')?.getFilterValue() as string) ?? ''}
					onChange={(e) =>
						table.getColumn('country')?.setFilterValue(e.target.value)
					}
					className="max-w-[200px]"
				/>
				<Input
					placeholder="Filter city..."
					value={(table.getColumn('city')?.getFilterValue() as string) ?? ''}
					onChange={(e) =>
						table.getColumn('city')?.setFilterValue(e.target.value)
					}
					className="max-w-[200px]"
				/>
				<Input
					placeholder="Filter IP..."
					value={(table.getColumn('ip')?.getFilterValue() as string) ?? ''}
					onChange={(e) =>
						table.getColumn('ip')?.setFilterValue(e.target.value)
					}
					className="max-w-[200px]"
				/>
				<Input
					placeholder="Filter ISP..."
					value={(table.getColumn('isp')?.getFilterValue() as string) ?? ''}
					onChange={(e) =>
						table.getColumn('isp')?.setFilterValue(e.target.value)
					}
					className="max-w-[200px]"
				/>
				{rateLimitedSeconds > 0 && (
					<span className="text-sm text-muted-foreground">
						Rate limited—retry in {rateLimitedSeconds}s
					</span>
				)}
				<Button variant="outline" size="sm" onClick={onFetchVisits} disabled={loading}>
					Refresh
				</Button>
			</div>
			<div className="flex flex-wrap items-center gap-3 text-sm">
				<span className="text-muted-foreground">Batch enrich (slow, ~1.4s between IPs)</span>
				<Input
					type="number"
					min={1}
					max={100}
					value={batchLimit}
					onChange={(e) => {
						const n = parseInt(e.target.value, 10);
						if (Number.isFinite(n)) setBatchLimit(Math.min(100, Math.max(1, n)));
					}}
					className="w-20 h-9"
					title="Max rows to attempt"
				/>
				<Button
					variant="outline"
					size="sm"
					onClick={() => void handleEnrichBatch()}
					disabled={
						batchRunning || loading || !authPassword || rateLimitedSeconds > 0
					}
				>
					{batchRunning ? 'Running…' : 'Enrich missing'}
				</Button>
				{batchNote && <span className="text-muted-foreground">{batchNote}</span>}
			</div>
			<div className="rounded-md border overflow-hidden">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id}>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext()
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext()
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									{loading ? 'Loading…' : 'No visits.'}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
				>
					Previous
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
				>
					Next
				</Button>
				<span className="text-sm text-muted-foreground">
					Page {table.getState().pagination.pageIndex + 1} of{' '}
					{table.getPageCount()}
				</span>
			</div>
		</div>
	);
}
