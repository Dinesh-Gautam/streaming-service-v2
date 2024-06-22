import { cache } from "react";

export const createCachedMovieMethod = <T extends (...args: any[]) => Promise<any>>(method: T) => {
    console.log("getting popular movies")
    return cache(async (...params: Parameters<T>): Promise<ReturnType<T>> => {
        return await method(...params);
    });
};