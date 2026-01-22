export interface ApiError {
    error: string;
    status?: number;
}

export interface ChangesResponse {
    changes: number;
}

export interface IdResponse {
    id: number;
}
