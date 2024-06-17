import { TMDBWebAPI } from "tmdb-js-web";

if (process.env.TMDB_API_KEY === undefined) {
    throw new Error("TMDB_API_KEY is not defined");
}

export const TmdbV3 = new TMDBWebAPI(process.env.TMDB_API_KEY).v3;

