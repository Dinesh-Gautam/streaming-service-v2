
'use client'

import { OriginalMovieDetail } from "@/server/db/movies"
import { model } from "mongoose"
import dynamic from "next/dynamic"

const Player = dynamic(() => import('./player').then(mod => mod.Player), { ssr: false })

export const DynamicPlayer = ({ movie }: { movie: Awaited<OriginalMovieDetail> }) => {
    return <Player movie={movie} />
}

