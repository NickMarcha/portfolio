export interface Visit {
	id: number;
	path: string;
	timestamp: string;
	ip: string | null;
	country: string | null;
	city: string | null;
	region: string | null;
	regionName: string | null;
	timezone: string | null;
	isp: string | null;
	org: string | null;
	lat: number | null;
	lon: number | null;
}

export function getAdminApiUrl(): string {
	if (typeof window === 'undefined') return '';
	const isLocal =
		window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
	return isLocal ? 'http://localhost:3000' : 'https://api-portfolio.nickmarcha.com';
}

export function getAdminAuthHeader(password: string): string {
	return 'Basic ' + btoa('admin:' + password);
}
