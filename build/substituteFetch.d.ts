type SubstituteFetchResponse = {
    status: number;
    ok: boolean;
    text: () => Promise<string>;
};
declare function substituteFetch(url: string, init: any): Promise<SubstituteFetchResponse>;
export { substituteFetch };
