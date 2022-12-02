declare class HttpError extends Error {
    status: number | null;
    constructor(message: string, status?: number);
}
declare function httpsGet(url: string): Promise<string>;
export { httpsGet, HttpError };
