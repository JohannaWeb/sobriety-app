export interface User {
    id: number;
    username: string;
    sobriety_start_date?: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    username: string;
}

export interface DecodedToken {
    id: number;
    username: string;
    iat: number;
    exp: number;
}
