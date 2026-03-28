'use client';

import * as React from 'react';
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	useReactTable,
} from '@tanstack/react-table';
import type { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
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

interface AdminVisitsTableProps {
	visits: Visit[];
	setVisits: React.Dispatch<React.SetStateAction<Visit[]>>;
	authPassword: string;
	apiUrl: string;
	loading: boolean;
	fetchError: string | null;
	onFetchVisits: () => void;
}

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
	const [enrichingId, setEnrichingId] = React.useState<number | null>(null);
	const [rateLimitedUntil, setRateLimitedUntil] = React.useState<number>(0);

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
				const needsEnrich =
					Boolean(v.ip) &&
					((!v.city && !v.isp) || v.lat == null || v.lon == null);
				const isRateLimited = Date.now() < rateLimitedUntil;
				return (
					<Button
						variant="outline"
						size="xs"
						disabled={!needsEnrich || !!enrichingId || isRateLimited}
						onClick={() => handleEnrich(v.id)}
					>
						{enrichingId === v.id ? '…' : 'Enrich'}
					</Button>
				);
			},
		},
	];

	const table = useReactTable({
		data: visits,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		state: { columnFilters },
	});

	const rateLimitedSeconds = Math.ceil((rateLimitedUntil - Date.now()) / 1000);

	return (
		<div className="space-y-4">
			<h2 className="text-base font-medium">Raw visits</h2>
			{fetchError && <p className="text-destructive text-sm">{fetchError}</p>}
			<div className="flex items-center gap-4 flex-wrap">
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
